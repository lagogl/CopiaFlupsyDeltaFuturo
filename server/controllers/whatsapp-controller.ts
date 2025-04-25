import { Request, Response } from "express";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Formatta il messaggio WhatsApp per il Diario di Bordo
 * @param data Dati del diario (operazioni, totali, giacenza)
 * @param date Data del diario
 */
function formatWhatsAppText(data: any, date: Date): string {
  const dateFormatted = format(date, 'dd/MM/yyyy', { locale: it });
  
  let text = `📔 *DIARIO DI BORDO - ${dateFormatted}*\n\n`;
  
  // Giacenza alla data corrente
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    text += `📈 *GIACENZA AL ${dateFormatted.toUpperCase()}*\n`;
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
  text += `🧮 *BILANCIO GIORNALIERO*\n`;
  text += `Entrate: ${data.totals.totale_entrate ? data.totals.totale_entrate.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Uscite: ${data.totals.totale_uscite ? data.totals.totale_uscite.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Bilancio netto: ${data.totals.bilancio_netto ? data.totals.bilancio_netto.toLocaleString('it-IT') : '0'} animali\n`;
  text += `Totale operazioni: ${data.totals.numero_operazioni}\n\n`;
  
  // Bilancio finale
  if (data.giacenza && data.giacenza.totale_giacenza !== undefined) {
    const bilancioFinale = data.giacenza.totale_giacenza + (parseInt(data.totals.bilancio_netto) || 0);
    text += `🏁 *BILANCIO FINALE*\n`;
    text += `Giacenza + Bilancio netto: ${bilancioFinale.toLocaleString('it-IT')} animali\n\n`;
  }

  // Se ci sono statistiche per taglia, aggiungiamole
  if (data.sizeStats && data.sizeStats.length > 0) {
    text += `📊 *STATISTICHE PER TAGLIA*\n`;
    data.sizeStats.forEach((stat: any) => {
      const tagliaMostrata = stat.taglia === 'Non specificata' ? 'In attesa di misurazione' : stat.taglia;
      text += `- ${tagliaMostrata}: Entrate: ${stat.entrate || 0}, Uscite: ${stat.uscite || 0}\n`;
    });
    text += '\n';
  }

  // Aggiunta di informazioni sulle operazioni
  if (data.operations && data.operations.length > 0) {
    text += `🔄 *OPERAZIONI DEL GIORNO* (${data.operations.length})\n`;
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
 * Ottiene dati per il diario di bordo
 */
export async function generateWhatsAppDiario(req: Request, res: Response) {
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
    
    // Genera il testo WhatsApp
    const whatsAppText = formatWhatsAppText(diarioData, date);
    
    return res.status(200).json({
      success: true,
      date: formattedDate,
      whatsAppText,
      diarioData
    });
    
  } catch (error) {
    console.error("Errore nella generazione del diario per WhatsApp:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nella generazione del diario: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Invia un messaggio WhatsApp utilizzando l'API WhatsApp Business Cloud
 */
export async function sendWhatsAppMessage(req: Request, res: Response) {
  try {
    // Ottieni il numero di telefono e il testo dal body della richiesta o utilizza valori predefiniti
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Numero di telefono non fornito. Usa il formato con prefisso internazionale, es: +393331234567"
      });
    }
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Messaggio non fornito"
      });
    }
    
    // Verifica WHATSAPP_TOKEN e WHATSAPP_PHONE_ID
    const whatsappToken = process.env.WHATSAPP_TOKEN;
    const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;
    
    if (!whatsappToken || !whatsappPhoneId) {
      return res.status(500).json({
        success: false,
        error: "Configurazione WhatsApp mancante. Impostare le variabili WHATSAPP_TOKEN e WHATSAPP_PHONE_ID"
      });
    }
    
    // Rimuovi eventuali spazi dal numero di telefono
    const formattedPhoneNumber = phoneNumber.replace(/\s+/g, '');
    
    // Prepara i dati per l'API WhatsApp
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhoneNumber,
      type: "text",
      text: {
        body: message
      }
    };
    
    // Effettua la richiesta all'API WhatsApp
    const response = await fetch(`https://graph.facebook.com/v13.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappToken}`
      },
      body: JSON.stringify(payload)
    });
    
    // Analizza la risposta
    const responseData = await response.json();
    
    if (response.ok) {
      console.log("Messaggio WhatsApp inviato con successo:", responseData);
      return res.status(200).json({
        success: true,
        message: "Messaggio WhatsApp inviato con successo",
        details: responseData
      });
    } else {
      console.error("Errore nell'invio del messaggio WhatsApp:", responseData);
      return res.status(response.status).json({
        success: false,
        error: `Errore nell'invio del messaggio WhatsApp: ${JSON.stringify(responseData)}`,
        details: responseData
      });
    }
    
  } catch (error) {
    console.error("Errore nell'invio del messaggio WhatsApp:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nell'invio del messaggio WhatsApp: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Genera e invia automaticamente il diario WhatsApp per la data specificata
 * (o per ieri se non specificato)
 */
export async function autoSendWhatsAppDiario(req: Request, res: Response) {
  try {
    // Usa la data di ieri per default, o la data fornita
    const dateParam = req.query.date ? String(req.query.date) : format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const groupIdParam = req.query.groupId ? String(req.query.groupId) : null;
    
    // Verifica se è specificato un numero di telefono per il gruppo
    const whatsappGroupId = groupIdParam || process.env.WHATSAPP_GROUP_ID;
    
    if (!whatsappGroupId) {
      return res.status(400).json({
        success: false,
        error: "ID del gruppo WhatsApp non specificato. Fornirlo come parametro di query o configurarlo come variabile d'ambiente WHATSAPP_GROUP_ID"
      });
    }
    
    // Genera prima il diario
    // Simuliamo una richiesta interna al nostro controller generateWhatsAppDiario
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
    await generateWhatsAppDiario(diarioReq, diarioRes);
    
    // Verifica se la generazione è riuscita
    if (!diarioData || !diarioData.success) {
      return res.status(500).json({
        success: false,
        error: diarioData?.error || "Errore nella generazione del diario WhatsApp"
      });
    }
    
    // Ora invia il messaggio WhatsApp con il testo generato
    const sendReq = {
      body: {
        phoneNumber: whatsappGroupId,
        message: diarioData.whatsAppText
      }
    } as Request;
    
    // Invia il messaggio
    return await sendWhatsAppMessage(sendReq, res);
    
  } catch (error) {
    console.error("Errore nell'invio automatico del diario WhatsApp:", error);
    return res.status(500).json({
      success: false,
      error: `Errore nell'invio automatico del diario WhatsApp: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}