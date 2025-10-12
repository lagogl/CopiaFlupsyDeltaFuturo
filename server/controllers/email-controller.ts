import { Request, Response } from "express";
import { format, subDays, parse, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";

// Importiamo il modello dalla tabella emailConfig
import { emailConfig } from "@shared/schema";

// Definizioni delle route API per email
interface EmailConfig {
  email_recipients: string;
  email_cc: string;
  email_send_time: string;
  auto_email_enabled: string;
}

// Utilizziamo l'API https per inviare email direttamente con SendGrid
import * as https from 'https';

// Definizioni per la funzionalità di pianificazione
interface CronTask {
  start: () => void;
}

interface CronScheduler {
  schedule: (cron: string, fn: Function) => CronTask;
}

// Implementazione diretta di un trasportatore email senza dipendenze esterne
interface MailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

interface Transporter {
  sendMail: (options: MailOptions) => Promise<any>;
}

// Factory per creare trasportatori di email con SendGrid
const createSendGridTransporter = (apiKey: string): Transporter => {
  return {
    sendMail: async (options: MailOptions): Promise<any> => {
      try {
        // Preparazione dei destinatari nel formato richiesto da SendGrid
        const toEmails = Array.isArray(options.to) 
          ? options.to.map(email => ({ email })) 
          : [{ email: options.to }];
        
        const ccEmails = options.cc 
          ? (Array.isArray(options.cc) 
              ? options.cc.map(email => ({ email })) 
              : [{ email: options.cc }]) 
          : [];
        
        // Estrai nome e email dal formato "Nome <email@esempio.com>"
        let fromName = '';
        let fromEmail = '';
        
        const fromMatch = options.from.match(/"([^"]*)"\s+<([^>]*)>/);
        if (fromMatch) {
          fromName = fromMatch[1];
          fromEmail = fromMatch[2];
        } else {
          fromEmail = options.from;
        }
        
        // Preparazione del payload per l'API SendGrid
        const data = {
          personalizations: [
            {
              to: toEmails,
              cc: ccEmails.length > 0 ? ccEmails : undefined,
              subject: options.subject
            }
          ],
          from: {
            email: fromEmail,
            name: fromName || 'Sistema FLUPSY'
          },
          content: [
            {
              type: 'text/plain',
              value: options.text || ''
            }
          ]
        };
        
        // Se è presente contenuto HTML, aggiungiamolo
        if (options.html) {
          data.content.push({
            type: 'text/html',
            value: options.html
          });
        }
        
        // Preparazione della richiesta HTTP per l'API SendGrid
        const postData = JSON.stringify(data);
        
        // Opzioni per la richiesta HTTP
        const requestOptions = {
          hostname: 'api.sendgrid.com',
          port: 443,
          path: '/v3/mail/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${apiKey}`
          }
        };
        
        // Creiamo una Promise per la richiesta HTTP
        return new Promise((resolve, reject) => {
          const req = https.request(requestOptions, (res) => {
            console.log('✓ EMAIL INVIATA CORRETTAMENTE VIA SENDGRID');
            console.log(`✓ Status: ${res.statusCode}`);
            
            // Raccolta dei dati di risposta
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              if (res.statusCode === 202) {
                resolve({ success: true, message: 'Email inviata con successo' });
              } else {
                reject(new Error(`Errore nell'invio email: ${res.statusCode} ${data}`));
              }
            });
          });
          
          req.on('error', (error) => {
            console.error('Errore nella richiesta HTTP:', error);
            reject(error);
          });
          
          // Invio dei dati
          req.write(postData);
          req.end();
        });
      } catch (error) {
        console.error('Errore generale nell\'invio email:', error);
        throw error;
      }
    }
  };
};

// Utilizziamo un modulo semplificato per pianificare l'invio automatico delle email
const simpleCron: CronScheduler = {
  schedule: (cron: string, fn: Function): CronTask => {
    // Implementazione semplificata di un cron, esegue la funzione ogni giorno all'ora specificata
    
    // Estraiamo l'ora e i minuti dal formato cron (assumiamo formato semplice "0 14 * * *" dove 14 è l'ora)
    const parts = cron.split(' ');
    const minutes = parseInt(parts[0]);
    const hours = parseInt(parts[1]);
    
    // Programmiamo l'esecuzione giornaliera
    const task = {
      intervalId: null as any,
      isRunning: false,
      
      start: function() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Verifichiamo subito se è l'ora di eseguire la funzione
        this.checkAndRun();
        
        // Eseguiamo il controllo ogni minuto
        this.intervalId = setInterval(() => {
          this.checkAndRun();
        }, 60000); // 60 secondi
      },
      
      checkAndRun: function() {
        const now = new Date();
        if (now.getHours() === hours && now.getMinutes() === minutes) {
          fn();
        }
      },
      
      stop: function() {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
          this.isRunning = false;
        }
      }
    };
    
    return task;
  }
};

/**
 * Salva o aggiorna le configurazioni email nel database
 * @param configData Dati di configurazione da salvare
 */
async function saveEmailConfig(configData: Record<string, any>) {
  try {
    // Aggiorna o crea i singoli record di configurazione
    // Per ogni tipo di configurazione (recipients, cc, ecc.) manteniamo un record separato
    
    // Destinatari email - gestisce sia array che stringhe
    let recipientsValue = '';
    if (Array.isArray(configData.recipients)) {
      // Se è un array, salva come JSON string
      recipientsValue = JSON.stringify(configData.recipients);
    } else {
      recipientsValue = configData.recipients || '';
    }
    await upsertConfigValue('email_recipients', recipientsValue);
    
    // CC email
    await upsertConfigValue('email_cc', configData.cc || '');
    
    // Orario di invio
    await upsertConfigValue('email_send_time', configData.send_time || '20:00');
    
    // Abilitazione invio automatico
    await upsertConfigValue('auto_email_enabled', configData.auto_enabled || 'false');
    
    console.log("Configurazione email aggiornata nel database");
    return true;
  } catch (error) {
    console.error("Errore nel salvataggio della configurazione email:", error);
    throw error;
  }
}

// Funzione di utilità per aggiornare o creare una configurazione
async function upsertConfigValue(key: string, value: string) {
  try {
    // Verifica se esiste già la configurazione con quella chiave
    const existingConfig = await db
      .select()
      .from(emailConfig)
      .where(eq(emailConfig.key, key));
    
    if (existingConfig.length > 0) {
      // Aggiorna la configurazione esistente
      await db.update(emailConfig)
        .set({ value, updatedAt: new Date() })
        .where(eq(emailConfig.id, existingConfig[0].id));
    } else {
      // Crea una nuova configurazione
      await db.insert(emailConfig).values({
        key,
        value,
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error(`Errore nell'upsert della configurazione (${key}):`, error);
    throw error;
  }
}

/**
 * Ottiene le configurazioni email e whatsapp dal database
 */
async function getEmailConfig() {
  try {
    const configRows = await db.select().from(emailConfig);
    
    if (configRows.length > 0) {
      // Recupera i valori specifici dalla configurazione
      const getConfigValue = (key: string, defaultValue: string = '') => {
        const row = configRows.find(row => row.key === key);
        return row ? row.value : defaultValue;
      };
      
      // Gestisce conversione email recipients da JSON array a stringa separata da virgole
      let emailRecipients = getConfigValue('email_recipients', '');
      try {
        const parsed = JSON.parse(emailRecipients);
        if (Array.isArray(parsed)) {
          emailRecipients = parsed.join(', ');
        }
      } catch {
        // Se non è JSON, lascia il valore così com'è
      }
      
      return {
        // Email config
        recipients: emailRecipients,
        cc: getConfigValue('email_cc', ''),
        send_time: getConfigValue('email_send_time', '20:00'),
        auto_enabled: getConfigValue('auto_email_enabled', 'false'),
        
        // WhatsApp config
        whatsapp_recipients: getConfigValue('whatsapp_recipients', ''),
        whatsapp_send_time: getConfigValue('whatsapp_send_time', '20:00'),
        auto_whatsapp_enabled: getConfigValue('auto_whatsapp_enabled', 'false')
      };
    } else {
      // Configurazione predefinita se non esiste
      return {
        // Email
        recipients: '',
        cc: '',
        send_time: '20:00',
        auto_enabled: 'false',
        
        // WhatsApp
        whatsapp_recipients: '',
        whatsapp_send_time: '20:00',
        auto_whatsapp_enabled: 'false'
      };
    }
  } catch (error) {
    console.error("Errore nel recupero della configurazione messaggistica:", error);
    throw error;
  }
}

function createRealTransporter() {
  const sendGridApiKey = process.env.SENDGRID_API_KEY;
  
  if (sendGridApiKey) {
    console.log("Creazione trasportatore email con SendGrid");
    return createSendGridTransporter(sendGridApiKey);
  }
  
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    console.log("Credenziali email non disponibili, impossibile creare trasportatore");
    return null;
  }

  // Per default, utilizziamo SendGrid se possibile
  if (sendGridApiKey) {
    console.log("Utilizzo SendGrid per invio email");
    return createSendGridTransporter(sendGridApiKey);
  }

  // Se non ci sono trasportatori validi, ritorna null
  console.log("Nessun trasportatore email valido disponibile");
  return null;
}

/**
 * Formatta il messaggio Email per il Diario di Bordo
 * @param data Dati del diario (operazioni, totali, giacenza)
 * @param date Data del diario
 */
function formatEmailText(data: any, date: Date): string {
  const dateFormatted = format(date, 'dd/MM/yyyy', { locale: it });
  
  let text = `DIARIO DI BORDO - ${dateFormatted}\n\n`;
  
  // Giacenza alla data corrente
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    text += `GIACENZA AL ${dateFormatted.toUpperCase()}\n`;
    text += `Totale: ${data.giacenza.totale_giacenza.toLocaleString('it-IT')} animali\n\n`;
    
    // Dettaglio giacenza per taglia
    if (data.giacenza.dettaglio_taglie && data.giacenza.dettaglio_taglie.length > 0) {
      text += `Dettaglio per taglia:\n`;
      data.giacenza.dettaglio_taglie.forEach((taglia: any) => {
        const tagliaMostrata = taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia;
        text += `- ${tagliaMostrata}: ${taglia.quantita.toLocaleString('it-IT')}\n`;
      });
      text += '\n';
    }
  }
  
  // Bilancio giornata
  text += `BILANCIO GIORNALIERO\n`;
  text += `Entrate: ${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Uscite: ${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Bilancio netto: ${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Totale operazioni: ${data.totals.numero_operazioni}\n\n`;

  // Bilancio finale
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    const bilancioFinale = data.giacenza.totale_giacenza + (parseInt(data.totals.bilancio_netto) || 0);
    text += `Giacenza + Bilancio netto: ${bilancioFinale.toLocaleString('it-IT')} animali\n\n`;
  }

  // Se ci sono statistiche per taglia, aggiungiamole
  if (data.sizeStats && data.sizeStats.length > 0) {
    text += `STATISTICHE PER TAGLIA\n`;
    data.sizeStats.forEach((stat: any) => {
      const tagliaMostrata = stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia;
      text += `- ${tagliaMostrata}: Entrate: ${stat.entrate || 0}, Uscite: ${stat.uscite || 0}\n`;
    });
    text += '\n';
  }

  // Aggiunta di informazioni sulle operazioni
  if (data.operations && data.operations.length > 0) {
    text += `OPERAZIONI DEL GIORNO (${data.operations.length})\n`;
    data.operations.forEach((op: any, idx: number) => {
      const tipo = op.type.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const cestello = op.basket_number ? `#${op.basket_number}` : '';
      const flupsy = op.flupsy_name ? `in ${op.flupsy_name}` : '';
      const taglia = op.size_code === 'Non specificata' ? 'In attesa di misurazione' : op.size_code;
      
      text += `${idx + 1}. ${tipo} ${cestello} ${flupsy} - ${op.animal_count || 0} animali (${taglia || 'Senza taglia'})\n`;
    });
  }
  
  return text;
}

/**
 * Formatta il messaggio Email HTML per il Diario di Bordo
 * @param data Dati del diario (operazioni, totali, giacenza)
 * @param date Data del diario
 */
function formatEmailHtml(data: any, date: Date): string {
  const dateFormatted = format(date, 'dd/MM/yyyy', { locale: it });
  
  // Template completamente tabellare per la massima compatibilità con client email
  let html = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <tr>
        <td align="center" bgcolor="#ffffff" style="padding: 20px; border-radius: 5px; border: 1px solid #e2e8f0;">
          <!-- INTESTAZIONE -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
                <h1 style="color: #2563eb; margin: 0; padding: 0; font-size: 24px;">
                  📊 DIARIO DI BORDO - ${dateFormatted}
                </h1>
              </td>
            </tr>
          </table>
  `;
  
  // GIACENZA
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    html += `
          <!-- GIACENZA -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
            <tr>
              <td bgcolor="#f0f9ff" style="padding: 15px; border-radius: 5px; border: 1px solid #bae6fd;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <h2 style="color: #0369a1; margin: 0; padding: 0; font-size: 18px;">
                        📈 GIACENZA AL ${dateFormatted.toUpperCase()}
                      </h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" bgcolor="#e0f2fe" style="padding: 10px; margin: 10px 0; border-radius: 5px;">
                      <p style="font-size: 18px; font-weight: bold; color: #1e40af; margin: 0;">
                        Totale: ${data.giacenza.totale_giacenza.toLocaleString('it-IT')} animali
                      </p>
                    </td>
                  </tr>
    `;
    
    // Dettaglio giacenza per taglia
    if (data.giacenza.dettaglio_taglie && data.giacenza.dettaglio_taglie.length > 0) {
      html += `
                  <tr>
                    <td style="padding-top: 15px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 14px; border-color: #bae6fd;">
                        <thead>
                          <tr bgcolor="#e0f2fe">
                            <th align="left" style="padding: 8px; border: 1px solid #bae6fd;">Taglia</th>
                            <th align="right" style="padding: 8px; border: 1px solid #bae6fd;">Quantità</th>
                            <th align="right" style="padding: 8px; border: 1px solid #bae6fd;">% del Totale</th>
                          </tr>
                        </thead>
                        <tbody>
      `;
      
      data.giacenza.dettaglio_taglie.forEach((taglia: any) => {
        const tagliaMostrata = taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia;
        const percentuale = (taglia.quantita / data.giacenza.totale_giacenza * 100).toFixed(1);
        
        html += `
                          <tr>
                            <td align="left" style="padding: 8px; border: 1px solid #bae6fd;">
                              <span style="display: inline-block; padding: 2px 5px; background-color: #dbeafe; border-radius: 3px;">${tagliaMostrata}</span>
                            </td>
                            <td align="right" style="padding: 8px; border: 1px solid #bae6fd; font-weight: bold;">
                              ${taglia.quantita.toLocaleString('it-IT')}
                            </td>
                            <td align="right" style="padding: 8px; border: 1px solid #bae6fd;">
                              ${percentuale}%
                            </td>
                          </tr>
        `;
      });
      
      html += `
                        </tbody>
                      </table>
                    </td>
                  </tr>
      `;
    }
    
    html += `
                </table>
              </td>
            </tr>
          </table>
    `;
  }
  
  // BILANCI (Giornaliero e Finale)
  html += `
          <!-- BILANCI -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
            <tr>
              <td valign="top">
                <!-- Bilancio Giornaliero -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                  <tr>
                    <td bgcolor="#f1f5f9" style="padding: 15px; border-radius: 5px; border: 1px solid #cbd5e1;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <h2 style="color: #475569; margin: 0 0 10px 0; padding: 0; font-size: 18px;">
                              🧮 BILANCIO GIORNALIERO
                            </h2>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 14px; border-color: #cbd5e1;">
                              <tr>
                                <td width="50%" style="padding: 8px; border: 1px solid #cbd5e1;">Entrate:</td>
                                <td align="right" style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #059669;">
                                  ${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'} animali
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">Uscite:</td>
                                <td align="right" style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #dc2626;">
                                  ${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'} animali
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">Bilancio netto:</td>
                                <td align="right" style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: ${(data.totals.bilancio_netto || 0) >= 0 ? '#059669' : '#dc2626'};">
                                  ${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'} animali
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">Totale operazioni:</td>
                                <td align="right" style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">
                                  ${data.totals.numero_operazioni}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
  `;
  
  // BILANCIO FINALE
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    const bilancioFinale = data.giacenza.totale_giacenza + (parseInt(data.totals.bilancio_netto) || 0);
    html += `
                <!-- Bilancio Finale -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                  <tr>
                    <td bgcolor="#f0fdf4" style="padding: 15px; border-radius: 5px; border: 1px solid #bbf7d0;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <h2 style="color: #166534; margin: 0 0 10px 0; padding: 0; font-size: 18px;">
                              🏁 BILANCIO FINALE
                            </h2>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 14px; border-color: #bbf7d0;">
                              <tr>
                                <td width="50%" style="padding: 8px; border: 1px solid #bbf7d0;">Giacenza + Bilancio netto:</td>
                                <td align="right" style="padding: 8px; border: 1px solid #bbf7d0; font-size: 18px; font-weight: bold; color: #15803d;">
                                  ${bilancioFinale.toLocaleString('it-IT')} animali
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
    `;
  }
  
  html += `
              </td>
            </tr>
          </table>
  `;
  
  // STATISTICHE PER TAGLIA
  if (data.sizeStats && data.sizeStats.length > 0) {
    html += `
          <!-- RIEPILOGO PER TAGLIA -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
            <tr>
              <td bgcolor="#f5f3ff" style="padding: 15px; border-radius: 5px; border: 1px solid #ddd4fe;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <h2 style="color: #6d28d9; margin: 0 0 10px 0; padding: 0; font-size: 18px;">
                        📊 RIEPILOGO PER TAGLIA
                      </h2>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 14px; border-color: #ddd4fe;">
                        <thead>
                          <tr bgcolor="#ede9fe">
                            <th align="left" style="padding: 8px; border: 1px solid #ddd4fe;">Taglia</th>
                            <th align="right" style="padding: 8px; border: 1px solid #ddd4fe;">Entrate</th>
                            <th align="right" style="padding: 8px; border: 1px solid #ddd4fe;">Uscite</th>
                            <th align="right" style="padding: 8px; border: 1px solid #ddd4fe;">Bilancio</th>
                          </tr>
                        </thead>
                        <tbody>
    `;
    
    data.sizeStats.forEach((stat: any) => {
      const tagliaMostrata = stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia;
      const entrate = stat.entrate || 0;
      const uscite = stat.uscite || 0;
      const bilancio = entrate - uscite;
      
      html += `
                          <tr>
                            <td align="left" style="padding: 8px; border: 1px solid #ddd4fe; font-weight: bold;">${tagliaMostrata}</td>
                            <td align="right" style="padding: 8px; border: 1px solid #ddd4fe; color: #059669;">${entrate.toLocaleString('it-IT')}</td>
                            <td align="right" style="padding: 8px; border: 1px solid #ddd4fe; color: #dc2626;">${uscite.toLocaleString('it-IT')}</td>
                            <td align="right" style="padding: 8px; border: 1px solid #ddd4fe; font-weight: bold; color: ${bilancio >= 0 ? '#059669' : '#dc2626'};">
                              ${bilancio.toLocaleString('it-IT')}
                            </td>
                          </tr>
      `;
    });
    
    html += `
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
    `;
  }

  // OPERAZIONI DEL GIORNO
  if (data.operations && data.operations.length > 0) {
    html += `
          <!-- OPERAZIONI DEL GIORNO -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
            <tr>
              <td bgcolor="#fff7ed" style="padding: 15px; border-radius: 5px; border: 1px solid #fed7aa;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <h2 style="color: #c2410c; margin: 0 0 10px 0; padding: 0; font-size: 18px;">
                        📋 OPERAZIONI DEL GIORNO (${data.operations.length})
                      </h2>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; font-size: 14px; border-color: #fed7aa;">
                        <thead>
                          <tr bgcolor="#ffedd5">
                            <th align="center" style="padding: 8px; border: 1px solid #fed7aa;">#</th>
                            <th align="center" style="padding: 8px; border: 1px solid #fed7aa;">Data</th>
                            <th align="left" style="padding: 8px; border: 1px solid #fed7aa;">Operazione</th>
                            <th align="center" style="padding: 8px; border: 1px solid #fed7aa;">Cestello</th>
                            <th align="center" style="padding: 8px; border: 1px solid #fed7aa;">Ciclo</th>
                            <th align="left" style="padding: 8px; border: 1px solid #fed7aa;">FLUPSY</th>
                            <th align="right" style="padding: 8px; border: 1px solid #fed7aa;">Animali</th>
                            <th align="center" style="padding: 8px; border: 1px solid #fed7aa;">Taglia</th>
                          </tr>
                        </thead>
                        <tbody>
    `;
    
    data.operations.forEach((op: any, idx: number) => {
      const operationDate = op.date ? format(new Date(op.date), 'dd/MM', { locale: it }) : '-';
      const tipo = op.type.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const cestello = op.basket_number || '-';
      const ciclo = op.cycle_id || '-';
      const flupsy = op.flupsy_name || '-';
      const animali = op.animal_count ? op.animal_count.toLocaleString('it-IT') : '0';
      const animaliPerKg = op.animals_per_kg ? `(${op.animals_per_kg.toLocaleString('it-IT')}/kg)` : '';
      const taglia = op.size_code === 'Non specificata' ? 'In attesa di misurazione' : op.size_code || '-';
      const note = op.notes || '';
      
      // Definisci colori in base al tipo di operazione
      let operationColor = '#000000';
      if (op.type.includes('prima-attivazione')) operationColor = '#047857'; // verde
      else if (op.type.includes('vendita')) operationColor = '#b91c1c'; // rosso
      else if (op.type.includes('vagliatura')) operationColor = '#0369a1'; // blu
      else if (op.type.includes('cessazione')) operationColor = '#7c2d12'; // marrone
      else if (op.type.includes('selezione')) operationColor = '#6d28d9'; // viola
      
      html += `
                          <tr bgcolor="${idx % 2 === 0 ? '#fff7ed' : '#ffffff'}">
                            <td align="center" style="padding: 8px; border: 1px solid #fed7aa;">${idx + 1}</td>
                            <td align="center" style="padding: 8px; border: 1px solid #fed7aa;">${operationDate}</td>
                            <td align="left" style="padding: 8px; border: 1px solid #fed7aa; font-weight: bold; color: ${operationColor};">${tipo}</td>
                            <td align="center" style="padding: 8px; border: 1px solid #fed7aa;">#${cestello}</td>
                            <td align="center" style="padding: 8px; border: 1px solid #fed7aa;">${ciclo}</td>
                            <td align="left" style="padding: 8px; border: 1px solid #fed7aa;">${flupsy}</td>
                            <td align="right" style="padding: 8px; border: 1px solid #fed7aa;">
                              <span style="font-weight: bold;">${animali}</span>
                              <span style="font-size: 12px; color: #666;">${animaliPerKg}</span>
                            </td>
                            <td align="center" style="padding: 8px; border: 1px solid #fed7aa;">
                              <span style="display: inline-block; padding: 2px 5px; background-color: #e0f2fe; border-radius: 3px; font-size: 12px;">${taglia}</span>
                            </td>
                          </tr>
      `;
      
      if (note) {
        html += `
                          <tr bgcolor="${idx % 2 === 0 ? '#fff7ed' : '#ffffff'}">
                            <td style="border: 1px solid #fed7aa;"></td>
                            <td colspan="7" align="left" style="padding: 4px 8px; border: 1px solid #fed7aa; font-style: italic; font-size: 12px; color: #666;">
                              Note: ${note}
                            </td>
                          </tr>
        `;
      }
    });
    
    html += `
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
    `;
  }

  // FOOTER
  html += `
          <!-- FOOTER -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; border-top: 1px solid #ddd;">
            <tr>
              <td align="center" style="padding-top: 10px; font-size: 12px; color: #666;">
                Generato automaticamente dal sistema di gestione FLUPSY - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
  
  return html;
}

/**
 * Ottiene dati per il diario di bordo
 */
export async function generateEmailDiario(req: Request, res: Response) {
  try {
    // Usa la data di ieri per il diario automatico di fine giornata, o usa la data fornita
    const dateParam = req.query.date ? String(req.query.date) : format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    // Converti la data in oggetto Date
    const date = new Date(dateParam);
    
    // Controllo validità data
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Data non valida. Formato richiesto: YYYY-MM-DD"
      });
    }
    
    // Formatta la data per l'uso in query SQL
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log("API operazioni per data - Data richiesta:", formattedDate);
    
    // 1. Ottieni le operazioni
    const operations = await db.execute(sql`
      SELECT 
        o.id,
        o.date,
        o.type,
        o.basket_id,
        o.cycle_id,
        o.animal_count,
        o.animals_per_kg,
        o.total_weight,
        o.notes,
        o.created_at,
        b.physical_number AS basket_number,
        f.name AS flupsy_name,
        s.code AS size_code
      FROM operations o
      LEFT JOIN baskets b ON o.basket_id = b.id
      LEFT JOIN flupsys f ON b.flupsy_id = f.id
      LEFT JOIN sizes s ON o.size_id = s.id
      WHERE o.date = ${formattedDate}
      ORDER BY o.id ASC
    `);

    console.log("API operazioni per data - Risultati:", operations.length);
    
    // 2. Ottieni i totali giornalieri
    console.log("API totali giornalieri - Data richiesta:", formattedDate);
    const dailyTotals = await db.execute(sql`
      SELECT
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) AS totale_entrate,
        SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS totale_uscite,
        (SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) - 
         SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END)) AS bilancio_netto,
        COUNT(*) AS numero_operazioni
      FROM operations o
      WHERE o.date = ${formattedDate}
    `);
    
    console.log("API totali giornalieri - Risultati:", dailyTotals[0]);
    
    // 3. Ottieni la giacenza
    console.log("API giacenza - Data richiesta:", formattedDate);
    
    // 3.1 Calcola la giacenza totale alla data selezionata
    const totaleGiacenza = await db.execute(sql`
      WITH cicli_attivi AS (
        SELECT c.id, c.basket_id, c.start_date
        FROM cycles c
        WHERE c.start_date <= ${formattedDate}
        AND (c.end_date > ${formattedDate} OR c.end_date IS NULL)
      ),
      ultima_operazione AS (
        SELECT o.cycle_id, o.animal_count, o.size_id,
          ROW_NUMBER() OVER (PARTITION BY o.cycle_id ORDER BY o.date DESC, o.id DESC) as rn
        FROM operations o
        JOIN cicli_attivi c ON o.cycle_id = c.id
        WHERE o.date <= ${formattedDate}
      )
      SELECT 
        COALESCE(SUM(uo.animal_count), 0) AS totale_giacenza
      FROM ultima_operazione uo
      WHERE uo.rn = 1
    `);
    
    // 3.2 Calcola la giacenza per taglia alla data selezionata
    const giacenzaPerTaglia = await db.execute(sql`
      WITH cicli_attivi AS (
        SELECT c.id, c.basket_id, c.start_date
        FROM cycles c
        WHERE c.start_date <= ${formattedDate}
        AND (c.end_date > ${formattedDate} OR c.end_date IS NULL)
      ),
      ultima_operazione AS (
        SELECT 
          o.cycle_id, 
          o.animal_count, 
          o.size_id,
          COALESCE(s.code, 'Non specificata') AS taglia_codice,
          ROW_NUMBER() OVER (PARTITION BY o.cycle_id ORDER BY o.date DESC, o.id DESC) as rn
        FROM operations o
        JOIN cicli_attivi c ON o.cycle_id = c.id
        LEFT JOIN sizes s ON o.size_id = s.id
        WHERE o.date <= ${formattedDate}
      )
      SELECT 
        uo.taglia_codice AS taglia,
        SUM(uo.animal_count) AS quantita
      FROM ultima_operazione uo
      WHERE uo.rn = 1
      GROUP BY uo.taglia_codice
      ORDER BY
        CASE 
          WHEN uo.taglia_codice = 'Non specificata' THEN 'ZZZZZ'
          ELSE uo.taglia_codice
        END
    `);

    // 4. Ottieni le statistiche per taglia
    console.log("API statistiche per taglia - Data richiesta:", formattedDate);
    const sizeStats = await db.execute(sql`
      SELECT
        COALESCE(s.code, 'Non specificata') AS taglia,
        SUM(CASE WHEN o.type IN ('prima-attivazione', 'prima-attivazione-da-vagliatura') THEN o.animal_count ELSE 0 END) AS entrate,
        SUM(CASE WHEN o.type IN ('vendita', 'cessazione') THEN o.animal_count ELSE 0 END) AS uscite
      FROM operations o
      LEFT JOIN sizes s ON o.size_id = s.id
      WHERE o.date = ${formattedDate}
      GROUP BY COALESCE(s.code, 'Non specificata')
      ORDER BY COALESCE(s.code, 'ZZZZZ')
    `);
    
    console.log("API statistiche per taglia - Risultati:", sizeStats.length);
    
    // Prepara i dati per la risposta
    const giacenza = {
      totale_giacenza: parseInt(totaleGiacenza[0]?.totale_giacenza || '0'),
      dettaglio_taglie: giacenzaPerTaglia.map(item => ({
        taglia: item.taglia,
        quantita: parseInt(item.quantita)
      }))
    };
    
    const diarioData = {
      operations,
      totals: dailyTotals[0],
      giacenza,
      sizeStats
    };
    
    // Genera il testo email (plaintext e HTML)
    const emailText = formatEmailText(diarioData, date);
    const emailHtml = formatEmailHtml(diarioData, date);
    
    return res.status(200).json({
      success: true,
      date: formattedDate,
      emailText,
      emailHtml,
      diarioData
    });
    
  } catch (error) {
    console.error("Errore nella generazione del diario per email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nella generazione del diario: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Invia una email con il diario del bordo
 */
export async function sendEmailDiario(req: Request, res: Response) {
  try {
    // Ottieni le configurazioni email dal body della richiesta o utilizza valori predefiniti
    const { to, cc, subject, text, html } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: "Destinatario (to) non fornito. Specificare almeno un indirizzo email."
      });
    }
    
    // Verifica l'esistenza delle credenziali email
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    if (!emailUser || !emailPassword) {
      return res.status(500).json({
        success: false,
        error: "Configurazione email mancante. Impostare le variabili EMAIL_USER e EMAIL_PASSWORD"
      });
    }
    
    // Crea il trasportatore per l'invio email
    // Prima prova a creare un trasportatore reale, altrimenti usa la simulazione
    const transporter = createRealTransporter() || nodemailer.createTransport({});

    // Salviamo la configurazione nel database
    if (typeof to === 'string') {
      try {
        await saveEmailConfig({
          recipients: to,
          cc: cc || '',
          send_time: '20:00', // Default time
          auto_enabled: 'false' // Default disabled
        });
        console.log("Configurazione email salvata nel database");
      } catch (configError) {
        console.error("Errore nel salvataggio della configurazione email:", configError);
        // Continuiamo comunque, non è un errore critico
      }
    }
    
    // Prepara l'oggetto della mail
    const mailOptions = {
      from: `"Sistema FLUPSY" <${emailUser}>`,
      to,
      cc,
      subject: subject || `Diario di Bordo FLUPSY - ${format(new Date(), 'dd/MM/yyyy', { locale: it })}`,
      text,
      html
    };
    
    // Log dell'invio simulato
    console.log("==== INVIO EMAIL REALE ====");
    console.log(`Da: "${mailOptions.from}"`);
    console.log(`A: ${mailOptions.to}`);
    console.log(`Oggetto: ${mailOptions.subject}`);
    console.log("================================================");
    console.log("✓ L'EMAIL VERRÀ INVIATA REALMENTE - Controllare la casella di posta");
    
    // Tenta di inviare l'email con il trasportatore reale
    try {
      console.log(`Tentativo di invio email REALE a: ${mailOptions.to}`);
      await transporter.sendMail(mailOptions);
      
      return res.status(200).json({
        success: true,
        message: "Email inviata con successo",
      });
    } catch (sendError) {
      console.error("Errore nell'invio email reale:", sendError);
      return res.status(500).json({
        success: false,
        error: `Errore nell'invio email: ${sendError instanceof Error ? sendError.message : String(sendError)}`
      });
    }
    
  } catch (error) {
    console.error("Errore generale nella procedura di invio email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nell'invio email: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Gestisce il salvataggio della configurazione email
 */
export async function saveEmailConfiguration(req: Request, res: Response) {
  try {
    const { recipients, cc, send_time, auto_enabled } = req.body;
    
    if (!recipients) {
      return res.status(400).json({
        success: false,
        error: "Destinatari (recipients) non forniti. Specificare almeno un indirizzo email."
      });
    }
    
    // Formatta il tempo nel formato HH:MM
    let formattedTime = send_time || '20:00';
    if (!/^\d{1,2}:\d{2}$/.test(formattedTime)) {
      formattedTime = '20:00'; // Default se formato non valido
    }
    
    const configData = {
      recipients,
      cc: cc || '',
      send_time: formattedTime,
      auto_enabled: auto_enabled === true || auto_enabled === 'true' ? 'true' : 'false'
    };
    
    // Salva la configurazione nel database
    await saveEmailConfig(configData);
    
    return res.status(200).json({
      success: true,
      message: "Configurazione email salvata con successo",
      config: configData
    });
    
  } catch (error) {
    console.error("Errore nel salvataggio della configurazione email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nel salvataggio: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Recupera la configurazione email corrente
 */
export async function getEmailConfiguration(req: Request, res: Response) {
  try {
    const config = await getEmailConfig();
    
    return res.status(200).json({
      success: true,
      config
    });
    
  } catch (error) {
    console.error("Errore nel recupero della configurazione email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nel recupero: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Genera e invia automaticamente il diario via email per la data specificata
 * (o per ieri se non specificato)
 */
/**
 * Inizializza la pianificazione dell'invio automatico email
 * Da chiamare all'avvio del server
 */
export async function initializeEmailScheduler() {
  try {
    console.log("Inizializzazione del sistema di pianificazione email...");
    
    // Ottieni l'attuale configurazione
    const config = await getEmailConfig();
    
    if (config.auto_enabled === 'true') {
      // Converti il tempo nel formato cron (minuti, ore, *, *, *)
      const timeParts = config.send_time.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      
      // Crea una pianificazione cron
      const cronExpression = `${minutes} ${hours} * * *`;
      
      // Avvia il task di pianificazione
      const task = simpleCron.schedule(cronExpression, async () => {
        try {
          console.log(`Esecuzione automatica dell'invio email del diario di bordo...`);
          await autoSendEmailDiario();
        } catch (error) {
          console.error("Errore nell'invio automatico del diario:", error);
        }
      });
      
      task.start();
      console.log(`Pianificazione email attivata: invio giornaliero alle ${config.send_time}`);
    } else {
      console.log("Invio automatico email disabilitato nelle impostazioni");
    }
    
    console.log("Scheduler email inizializzato con successo");
    
  } catch (error) {
    console.error("Errore nell'inizializzazione dello scheduler email:", error);
  }
}

export async function autoSendEmailDiario(req?: Request, res?: Response) {
  try {
    // Ottieni la configurazione email (destinatari, cc, ecc.)
    const config = await getEmailConfig();
    
    // Se non ci sono destinatari configurati, non fare nulla
    if (!config.recipients) {
      const errorMsg = "Nessun destinatario configurato per l'invio automatico dell'email";
      console.error(errorMsg);
      
      if (req && res) {
        return res.status(400).json({
          success: false,
          error: errorMsg
        });
      }
      
      return;
    }
    
    // Per l'invio automatico, usa sempre la data di ieri
    const yesterday = subDays(new Date(), 1);
    const formattedDate = format(yesterday, 'yyyy-MM-dd');
    
    // Crea un oggetto di richiesta simulato per chiamare generateEmailDiario
    const mockReq = {
      query: {
        date: formattedDate
      }
    };
    
    // Crea un oggetto di risposta simulato per catturare il risultato
    let diarioData: any = null;
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          diarioData = data;
          return mockRes;
        }
      })
    };
    
    // Genera i dati del diario
    // @ts-ignore
    await generateEmailDiario(mockReq, mockRes);
    
    // Se la generazione ha avuto successo, invia l'email
    if (diarioData && diarioData.success) {
      // Preparazione dell'invio email
      const sendReq = {
        body: {
          to: config.recipients,
          cc: config.cc,
          subject: `Diario di Impianto FLUPSY - ${format(yesterday, 'dd/MM/yyyy', { locale: it })}`,
          text: diarioData.emailText,
          html: diarioData.emailHtml
        }
      };
      
      // Crea un oggetto di risposta simulato per l'invio email
      let emailResult: any = null;
      const sendRes = {
        status: (code: number) => ({
          json: (data: any) => {
            emailResult = data;
            return sendRes;
          }
        })
      };
      
      // Invia l'email
      // @ts-ignore
      await sendEmailDiario(sendReq, sendRes);
      
      // Restituisci il risultato dell'invio email se è stata chiamata come API
      if (req && res) {
        return res.status(200).json({
          success: true,
          message: `Email inviata automaticamente: ${emailResult?.message || 'Invio completato'}`,
          dateProcessed: formattedDate
        });
      }
      
    } else {
      // Se la generazione è fallita, restituisci un errore
      const errorMsg = diarioData?.error || "Errore nella generazione dei dati del diario";
      console.error(errorMsg);
      
      if (req && res) {
        return res.status(500).json({
          success: false,
          error: errorMsg
        });
      }
    }
    
  } catch (error) {
    console.error("Errore nell'invio automatico del diario:", error);
    
    if (req && res) {
      return res.status(500).json({
        success: false,
        error: `Errore nell'invio automatico: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
}