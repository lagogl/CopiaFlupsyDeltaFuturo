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

// Tentativo di importare nodemailer e node-cron
let nodemailer: any;
let nodeCron: any;

try {
  nodemailer = require('nodemailer');
  console.log('Modulo nodemailer caricato correttamente!');
} catch (err) {
  console.log('Modulo nodemailer non disponibile, utilizzerò la simulazione');
  // Simuliamo nodemailer per l'invio email
  nodemailer = {
    createTransport: () => {
      return {
        sendMail: async (options: any) => {
          console.log('==== SIMULAZIONE INVIO EMAIL ====');
          console.log(`Da: ${options.from}`);
          console.log(`A: ${options.to}`);
          if (options.cc) console.log(`CC: ${options.cc}`);
          console.log(`Oggetto: ${options.subject}`);
          console.log('Contenuto: [Omesso per brevità]');
          console.log('================================================');
          return { messageId: 'simulated-message-id-' + Date.now() };
        }
      };
    }
  };
}

try {
  nodeCron = require('node-cron');
  console.log('Modulo node-cron caricato correttamente!');
} catch (err) {
  console.log('Modulo node-cron non disponibile, la pianificazione automatica non sarà attiva');
  nodeCron = {
    schedule: (cron: string, fn: Function) => {
      console.log(`Simulazione schedulazione cron: "${cron}"`);
      return { start: () => console.log('Simulazione avvio scheduler') };
    }
  };
}

/**
 * Salva o aggiorna le configurazioni email nel database
 * @param configData Dati di configurazione da salvare
 */
async function saveEmailConfig(configData: Record<string, string>) {
  try {
    // Per ogni coppia chiave-valore, aggiorna il database
    for (const [key, value] of Object.entries(configData)) {
      // Controlla se la configurazione esiste già
      const existing = await db.select().from(emailConfig)
        .where(eq(emailConfig.key, key));
      
      if (existing.length > 0) {
        // Aggiorna la configurazione esistente
        await db.update(emailConfig)
          .set({ 
            value: value,
            updatedAt: new Date()
          })
          .where(eq(emailConfig.key, key));
      } else {
        // Inserisci nuova configurazione
        await db.insert(emailConfig).values({
          key: key,
          value: value
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Errore nel salvataggio della configurazione email:', error);
    return false;
  }
}

/**
 * Ottiene le configurazioni email dal database
 */
async function getEmailConfig() {
  try {
    const configs = await db.select().from(emailConfig);
    const result: Record<string, string> = {};
    
    configs.forEach(config => {
      result[config.key] = config.value || '';
    });
    
    return result;
  } catch (error) {
    console.error('Errore nel recupero della configurazione email:', error);
    return {};
  }
}

// Funzione per creare un trasportatore reale di nodemailer
function createRealTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    console.log('ATTENZIONE: Credenziali email mancanti. Modalità simulazione attiva.');
    return null;
  }
  
  // Se abbiamo le credenziali, creiamo un trasportatore reale
  try {
    console.log(`Creazione trasportatore email reale per: ${emailUser}`);
    
    // Poiché sappiamo che il gestore è Gmail, ottimizziamo la configurazione per esso
    const transporterConfig = {
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      },
      // La seguente configurazione serve per Gmail con password delle app
      // Se non funziona, potrebbe essere necessario abilitare "App meno sicure" nell'account Google
      // o generare una password specifica per l'app
      tls: {
        rejectUnauthorized: false
      }
    };
    
    return nodemailer.createTransport(transporterConfig);
  } catch (error) {
    console.error('Errore nella creazione del trasportatore email:', error);
    return null;
  }
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
    text += `Totale: ${data.giacenza.totale_giacenza.toLocaleString('it-IT')} animali\n`;
    
    // Dettaglio giacenza per taglia
    if (data.giacenza.dettaglio_taglie && data.giacenza.dettaglio_taglie.length > 0) {
      text += `Dettaglio:\n`;
      data.giacenza.dettaglio_taglie.forEach((taglia: any) => {
        const tagliaMostrata = taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia;
        text += `- ${tagliaMostrata}: ${taglia.quantita.toLocaleString('it-IT')} animali\n`;
      });
    }
    text += '\n';
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
    text += `BILANCIO FINALE\n`;
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
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        DIARIO DI BORDO - ${dateFormatted}
      </h1>
  `;
  
  // Giacenza alla data corrente
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    html += `
      <div style="margin: 15px 0; padding: 10px; background-color: #f0f9ff; border-radius: 5px;">
        <h2 style="color: #0369a1; margin-top: 0;">GIACENZA AL ${dateFormatted.toUpperCase()}</h2>
        <p style="font-size: 18px; font-weight: bold; color: #1e40af;">
          Totale: ${data.giacenza.totale_giacenza.toLocaleString('it-IT')} animali
        </p>
    `;
    
    // Dettaglio giacenza per taglia
    if (data.giacenza.dettaglio_taglie && data.giacenza.dettaglio_taglie.length > 0) {
      html += `<div style="margin-top: 10px;"><strong>Dettaglio:</strong>`;
      html += `<ul style="list-style-type: none; padding-left: 10px;">`;
      data.giacenza.dettaglio_taglie.forEach((taglia: any) => {
        const tagliaMostrata = taglia.taglia === 'Non specificata' ? 'In attesa di misurazione' : taglia.taglia;
        html += `<li style="margin: 5px 0; display: flex; justify-content: space-between;">
          <span style="display: inline-block; padding: 2px 5px; background-color: #e0f2fe; border-radius: 3px;">${tagliaMostrata}</span>
          <span style="font-weight: bold;">${taglia.quantita.toLocaleString('it-IT')}</span>
        </li>`;
      });
      html += `</ul></div>`;
    }
    
    html += `</div>`;
  }
  
  // Bilancio giornata
  html += `
    <div style="margin: 15px 0; display: flex; flex-wrap: wrap; gap: 10px;">
      <div style="flex: 1; min-width: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #666; font-size: 14px;">Entrate</h3>
        <p style="margin-bottom: 0; font-size: 18px; font-weight: bold; color: #059669;">
          ${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'}
        </p>
      </div>
      <div style="flex: 1; min-width: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #666; font-size: 14px;">Uscite</h3>
        <p style="margin-bottom: 0; font-size: 18px; font-weight: bold; color: #dc2626;">
          ${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'}
        </p>
      </div>
      <div style="flex: 1; min-width: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #666; font-size: 14px;">Bilancio Netto</h3>
        <p style="margin-bottom: 0; font-size: 18px; font-weight: bold; color: ${(data.totals.bilancio_netto || 0) >= 0 ? '#059669' : '#dc2626'};">
          ${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'}
        </p>
      </div>
      <div style="flex: 1; min-width: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #666; font-size: 14px;">N° Operazioni</h3>
        <p style="margin-bottom: 0; font-size: 18px; font-weight: bold;">
          ${data.totals.numero_operazioni}
        </p>
      </div>
    </div>
  `;
  
  // Bilancio finale
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    const bilancioFinale = data.giacenza.totale_giacenza + (parseInt(data.totals.bilancio_netto) || 0);
    html += `
      <div style="margin: 15px 0; padding: 10px; background-color: #f0fdf4; border-radius: 5px; border-top: 1px solid #ddd;">
        <h3 style="margin-top: 0; color: #666; font-size: 14px;">Bilancio Finale (Giacenza + Bilancio Netto)</h3>
        <p style="margin-bottom: 0; font-size: 20px; font-weight: bold; color: #15803d;">
          ${bilancioFinale.toLocaleString('it-IT')} animali
        </p>
      </div>
    `;
  }

  // Se ci sono statistiche per taglia, aggiungiamole
  if (data.sizeStats && data.sizeStats.length > 0) {
    html += `
      <div style="margin: 15px 0; padding: 10px; background-color: #f5f3ff; border-radius: 5px;">
        <h2 style="color: #6d28d9; margin-top: 0;">STATISTICHE PER TAGLIA</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Taglia</th>
              <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Entrate</th>
              <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Uscite</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.sizeStats.forEach((stat: any) => {
      const tagliaMostrata = stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia;
      html += `
        <tr>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${tagliaMostrata}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee; color: #059669;">${stat.entrate || 0}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee; color: #dc2626;">${stat.uscite || 0}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Aggiunta di informazioni sulle operazioni
  if (data.operations && data.operations.length > 0) {
    html += `
      <div style="margin: 15px 0; padding: 10px; background-color: #fff7ed; border-radius: 5px;">
        <h2 style="color: #c2410c; margin-top: 0;">OPERAZIONI DEL GIORNO (${data.operations.length})</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">#</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Tipo</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Cestello</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">FLUPSY</th>
              <th style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Animali</th>
              <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Taglia</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.operations.forEach((op: any, idx: number) => {
      const tipo = op.type.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const cestello = op.basket_number || '';
      const flupsy = op.flupsy_name || '';
      const taglia = op.size_code === 'Non specificata' ? 'In attesa di misurazione' : op.size_code || 'Senza taglia';
      
      html += `
        <tr>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${idx + 1}</td>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${tipo}</td>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${cestello}</td>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${flupsy}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee;">${op.animal_count || 0}</td>
          <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">${taglia}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  html += `
    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
      Generato automaticamente dal sistema di gestione FLUPSY - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}
    </div>
  </div>`;
  
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
    const transporter = createRealTransporter() || nodemailer.createTransport();
    
    // Prepara le opzioni dell'email
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const ccAddresses = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined;
    const emailSubject = subject || `Diario di Bordo FLUPSY - ${format(new Date(), 'dd/MM/yyyy', { locale: it })}`;
    
    // Costruisci il messaggio email
    const mailOptions = {
      from: `"Sistema FLUPSY" <${emailUser}>`,
      to: toAddresses,
      cc: ccAddresses,
      subject: emailSubject,
      text: text || "Il contenuto del diario non è stato fornito.",
      html: html || `<p>${text || "Il contenuto del diario non è stato fornito."}</p>`
    };
    
    // Tentativo di invio email
    console.log(`Tentativo di invio email a: ${toAddresses}`);
    const info = await transporter.sendMail(mailOptions);
    
    // Salva i destinatari come predefiniti nel database per usi futuri
    try {
      const saveDest = Array.isArray(to) ? to.join(',') : String(to);
      const saveCC = cc ? (Array.isArray(cc) ? cc.join(',') : String(cc)) : '';
      
      await saveEmailConfig({
        'email_recipients': saveDest,
        'email_cc': saveCC
      });
      
      console.log('Configurazione email salvata nel database');
    } catch (saveError) {
      console.error('Errore nel salvare le configurazioni email:', saveError);
      // Continuiamo comunque anche se il salvataggio fallisce
    }
    
    // Determina se è stata inviata realmente o simulata
    const isSimulated = !('service' in transporter || 'host' in transporter);
    
    return res.status(200).json({
      success: true,
      message: isSimulated ? "Email simulata inviata con successo" : "Email inviata con successo",
      messageId: info.messageId,
      note: isSimulated ? "L'email è stata simulata per test" : undefined,
      emailPreview: {
        from: `"Sistema FLUPSY" <${emailUser}>`,
        to: toAddresses,
        cc: ccAddresses,
        subject: emailSubject,
        sent: !isSimulated
      }
    });
    
  } catch (error) {
    console.error("Errore nell'invio email:", error);
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
    const { 
      recipients, 
      cc, 
      sendTime, 
      autoEnabled 
    } = req.body;
    
    if (!recipients) {
      return res.status(400).json({
        success: false,
        error: "I destinatari (recipients) sono obbligatori."
      });
    }
    
    // Controlla che il formato dell'orario sia valido (HH:MM)
    if (sendTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(sendTime)) {
      return res.status(400).json({
        success: false,
        error: "Il formato dell'orario deve essere HH:MM (es. 20:00)"
      });
    }
    
    // Salva la configurazione
    const configData: Record<string, string> = {};
    
    if (recipients) configData.email_recipients = recipients;
    if (cc !== undefined) configData.email_cc = cc;
    if (sendTime) configData.email_send_time = sendTime;
    if (autoEnabled !== undefined) configData.auto_email_enabled = autoEnabled ? 'true' : 'false';
    
    const saved = await saveEmailConfig(configData);
    
    if (!saved) {
      return res.status(500).json({
        success: false,
        error: "Errore nel salvare la configurazione email"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Configurazione email salvata con successo",
      config: configData
    });
    
  } catch (error) {
    console.error("Errore nel salvare la configurazione email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nel salvare la configurazione email: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Recupera la configurazione email corrente
 */
export async function getEmailConfiguration(req: Request, res: Response) {
  try {
    const config = await getEmailConfig();
    
    // Prepara la risposta
    const response = {
      recipients: config.email_recipients || '',
      cc: config.email_cc || '',
      sendTime: config.email_send_time || '20:00',
      autoEnabled: config.auto_email_enabled === 'true'
    };
    
    return res.status(200).json({
      success: true,
      config: response
    });
    
  } catch (error) {
    console.error("Errore nel recuperare la configurazione email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nel recuperare la configurazione email: ${error instanceof Error ? error.message : String(error)}`
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
    
    // Recupera la configurazione dal database
    const config = await getEmailConfig();
    
    // Verifica se l'invio automatico è abilitato
    if (config.auto_email_enabled !== 'true') {
      console.log("Invio automatico email disabilitato nelle impostazioni");
      return;
    }
    
    // Verifica se ci sono destinatari configurati
    if (!config.email_recipients) {
      console.log("Nessun destinatario configurato per l'invio automatico email");
      return;
    }
    
    // Ottieni l'orario di invio (default: 20:00)
    const sendTime = config.email_send_time || '20:00';
    const [hours, minutes] = sendTime.split(':').map(num => parseInt(num, 10));
    
    // Crea l'espressione cron per l'orario specificato
    const cronExpression = `${minutes} ${hours} * * *`;  // Minuti Ore * * * (ogni giorno all'orario specificato)
    
    console.log(`Configurazione della pianificazione email: ${cronExpression} (${sendTime})`);
    
    // Pianifica l'invio automatico
    const emailScheduler = nodeCron.schedule(cronExpression, async () => {
      console.log(`Esecuzione invio automatico email pianificato (${format(new Date(), 'yyyy-MM-dd HH:mm:ss')})`);
      
      try {
        // Prepara la richiesta per l'invio automatico
        const autoReq = { 
          query: { 
            date: format(subDays(new Date(), 1), 'yyyy-MM-dd') 
          }
        } as unknown as Request;
        
        const autoRes = {
          status: (code: number) => ({
            json: (data: any) => {
              console.log(`Risultato invio automatico: ${code === 200 ? 'Successo' : 'Errore'}`);
              return autoRes;
            }
          })
        } as unknown as Response;
        
        // Invoca la funzione di invio automatico
        await autoSendEmailDiario(autoReq, autoRes);
        
      } catch (error) {
        console.error("Errore durante l'invio automatico pianificato:", error);
      }
    });
    
    // Avvia lo scheduler
    emailScheduler.start();
    console.log("Pianificazione dell'invio email avviata con successo");
    
  } catch (error) {
    console.error("Errore nell'inizializzazione dello scheduler email:", error);
  }
}

export async function autoSendEmailDiario(req: Request, res: Response) {
  try {
    // Usa la data di ieri per default, o la data fornita
    const dateParam = req.query.date ? String(req.query.date) : format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    // Verifica se sono specificati i destinatari
    const toParam = req.query.to ? String(req.query.to) : null;
    const ccParam = req.query.cc ? String(req.query.cc) : null;
    
    // Se non ci sono destinatari, verifica le variabili d'ambiente
    const emailRecipients = toParam || process.env.EMAIL_RECIPIENTS;
    
    if (!emailRecipients) {
      return res.status(400).json({
        success: false,
        error: "Destinatari email non specificati. Fornirli come parametro di query 'to' o configurarli come variabile d'ambiente EMAIL_RECIPIENTS"
      });
    }
    
    // Genera prima il diario
    // Simuliamo una richiesta interna al nostro controller generateEmailDiario
    const diarioReq = { query: { date: dateParam } } as Request;
    let diarioData: any = null;
    
    // Funzione temporanea per catturare la risposta
    const diarioRes = {
      status: (code: number) => ({
        json: (data: any) => {
          diarioData = data;
          return diarioRes;
        }
      })
    } as unknown as Response;
    
    // Genera il diario
    await generateEmailDiario(diarioReq, diarioRes);
    
    // Verifica se la generazione è riuscita
    if (!diarioData || !diarioData.success) {
      return res.status(500).json({
        success: false,
        error: diarioData?.error || "Errore nella generazione del diario email"
      });
    }
    
    // Prepara i dati per l'invio email
    const dateFormatted = format(new Date(dateParam), 'dd/MM/yyyy', { locale: it });
    
    // Ora invia l'email con il diario generato
    const sendReq = {
      body: {
        to: emailRecipients.split(',').map((email: string) => email.trim()),
        cc: ccParam ? ccParam.split(',').map((email: string) => email.trim()) : undefined,
        subject: `Diario di Bordo FLUPSY - ${dateFormatted}`,
        text: diarioData.emailText,
        html: diarioData.emailHtml
      }
    } as Request;
    
    // Invia l'email
    return await sendEmailDiario(sendReq, res);
    
  } catch (error) {
    console.error("Errore nell'invio automatico del diario email:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nell'invio automatico del diario email: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}