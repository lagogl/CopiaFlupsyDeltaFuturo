import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { sendGmailEmail, getEmailRecipients } from './gmail-service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { advancedSales, ddtRighe, ddt } from '@shared/schema';

/**
 * Genera PDF DDT (riutilizza logica esistente)
 */
async function generateDDTPdf(saleId: number): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const { getCompanyLogo } = await import('./logo-service');
  
  // Recupera dati vendita con DDT collegato
  const sale = await db.query.advancedSales.findFirst({
    where: eq(advancedSales.id, saleId),
    with: {
      bags: {
        with: {
          allocations: {
            with: {
              basket: {
                with: {
                  flupsy: true,
                  size: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (!sale || !sale.ddtId) {
    throw new Error(`Vendita ${saleId} o DDT non trovato`);
  }

  // Recupera DDT principale
  const [ddtData] = await db.select().from(ddt).where(eq(ddt.id, sale.ddtId)).limit(1);
  
  if (!ddtData) {
    throw new Error(`DDT ${sale.ddtId} non trovato`);
  }
  
  // Recupera righe DDT
  const lines = await db.query.ddtRighe.findMany({
    where: eq(ddtRighe.ddtId, sale.ddtId),
    orderBy: (ddtRighe, { asc }) => [asc(ddtRighe.id)]
  });
  
  // Crea PDF
  const doc = new PDFDocument({ 
    size: 'A4',
    layout: 'landscape',
    margin: 40
  });
  
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  
  return new Promise<Buffer>(async (resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    try {
      // Logo aziendale
      const logoPath = await getCompanyLogo();
      if (logoPath) {
        doc.image(logoPath, 40, 40, { width: 120 });
      }
      
      // Intestazione DDT
      doc.fontSize(20).font('Helvetica-Bold').text('DOCUMENTO DI TRASPORTO', 200, 50);
      doc.fontSize(12).font('Helvetica').text(`N° ${ddtData.numero}`, 200, 75);
      doc.text(`Data: ${format(new Date(ddtData.data), 'dd/MM/yyyy', { locale: it })}`, 200, 90);
      
      // Dati cliente (snapshot immutabile dal DDT)
      doc.fontSize(11).font('Helvetica-Bold').text('DESTINATARIO:', 40, 140);
      doc.fontSize(10).font('Helvetica');
      doc.text(ddtData.clienteNome || 'N/A', 40, 160);
      if (ddtData.clienteIndirizzo) doc.text(ddtData.clienteIndirizzo, 40, 175);
      if (ddtData.clienteCitta || ddtData.clienteProvincia || ddtData.clienteCap) {
        doc.text(`${ddtData.clienteCap || ''} ${ddtData.clienteCitta || ''} (${ddtData.clienteProvincia || ''})`, 40, 190);
      }
      if (ddtData.clientePiva) doc.text(`P.IVA: ${ddtData.clientePiva}`, 40, 205);
      
      // Tabella righe DDT (solo descrizione e quantità)
      const tableTop = 250;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Descrizione', 40, tableTop);
      doc.text('Quantità', 500, tableTop, { width: 150, align: 'right' });
      doc.text('U.M.', 700, tableTop, { width: 100, align: 'center' });
      
      doc.moveTo(40, tableTop + 20).lineTo(800, tableTop + 20).stroke();
      
      let yPos = tableTop + 30;
      doc.font('Helvetica').fontSize(10);
      
      for (const line of lines) {
        doc.text(line.descrizione || 'N/A', 40, yPos, { width: 450 });
        doc.text(parseFloat(line.quantita || '0').toLocaleString('it-IT'), 500, yPos, { width: 150, align: 'right' });
        doc.text(line.unitaMisura || 'NR', 700, yPos, { width: 100, align: 'center' });
        
        yPos += 25;
        
        if (yPos > 500) {
          doc.addPage({ layout: 'landscape' });
          yPos = 40;
        }
      }
      
      // Totale animali
      const totalQuantity = lines.reduce((sum, line) => 
        sum + parseFloat(line.quantita || '0'), 0
      );
      
      doc.moveTo(40, yPos).lineTo(800, yPos).stroke();
      yPos += 10;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTALE ANIMALI:', 500, yPos);
      doc.text(totalQuantity.toLocaleString('it-IT'), 700, yPos, { width: 100, align: 'right' });
      
      // Peso totale dal DDT (se disponibile)
      if (ddtData.pesoTotale) {
        yPos += 20;
        doc.text('PESO TOTALE:', 500, yPos);
        doc.text(`${parseFloat(ddtData.pesoTotale).toFixed(2)} kg`, 700, yPos, { width: 100, align: 'right' });
      }
      
      // Footer
      doc.fontSize(8).font('Helvetica').text(
        'Documento generato automaticamente dal Sistema FLUPSY',
        40, 550,
        { align: 'center' }
      );
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Invia email di conferma invio DDT a Fatture in Cloud con dettaglio vendita e PDF allegato
 */
export async function sendDDTConfirmationEmail(saleId: number): Promise<void> {
  try {
    const recipients = await getEmailRecipients();
    
    if (recipients.length === 0) {
      console.log('⚠️ Nessun destinatario configurato per email DDT');
      return;
    }
    
    // Recupera dati vendita completi
    const sale = await db.query.advancedSales.findFirst({
      where: eq(advancedSales.id, saleId),
      with: {
        bags: {
          with: {
            allocations: {
              with: {
                basket: {
                  with: {
                    flupsy: true,
                    size: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!sale || !sale.ddtId) {
      throw new Error(`Vendita ${saleId} o DDT non trovato`);
    }

    // Recupera DDT principale
    const [ddtData] = await db.select().from(ddt).where(eq(ddt.id, sale.ddtId)).limit(1);
    
    if (!ddtData) {
      throw new Error(`DDT ${sale.ddtId} non trovato`);
    }
    
    // Recupera righe DDT
    const lines = await db.query.ddtRighe.findMany({
      where: eq(ddtRighe.ddtId, sale.ddtId),
      orderBy: (ddtRighe, { asc }) => [asc(ddtRighe.id)]
    });
    
    // Usa customerDetails invece di customerDataSnapshot
    const customerData = sale.customerDetails || {};
    const dateFormatted = format(new Date(sale.saleDate), 'dd/MM/yyyy', { locale: it });
    
    // Calcola totali
    const totalQuantity = lines.reduce((sum, line) => sum + parseFloat(line.quantita || '0'), 0);
    const totalWeight = ddtData.pesoTotale ? parseFloat(ddtData.pesoTotale) : 0;
    
    // Costruisci HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
          ✅ DDT Inviato a Fatture in Cloud - ${dateFormatted}
        </h2>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">📋 Informazioni DDT</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;"><strong>Numero DDT:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;">${ddtData.numero}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;"><strong>Data:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;"><strong>Stato:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;">
                <span style="background-color: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">
                  INVIATO
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin-top: 0;">👤 Dati Cliente</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>Ragione Sociale:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${ddtData.clienteNome || 'N/A'}</td>
            </tr>
            ${ddtData.clienteIndirizzo ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>Indirizzo:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${ddtData.clienteIndirizzo}</td>
              </tr>
            ` : ''}
            ${ddtData.clienteCitta ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>Città:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${ddtData.clienteCap || ''} ${ddtData.clienteCitta} (${ddtData.clienteProvincia || ''})</td>
              </tr>
            ` : ''}
            ${ddtData.clientePiva ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>P.IVA:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${ddtData.clientePiva}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #475569; margin-top: 0;">📦 Dettaglio Merce</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #e2e8f0;">
                <th style="padding: 10px; text-align: left; border: 1px solid #cbd5e1;">Descrizione</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Quantità</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #cbd5e1;">U.M.</th>
              </tr>
            </thead>
            <tbody>
              ${lines.map(line => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;">
                      ${line.descrizione || 'N/A'}
                    </td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold;">
                      ${parseFloat(line.quantita || '0').toLocaleString('it-IT')}
                    </td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #cbd5e1;">
                      ${line.unitaMisura || 'NR'}
                    </td>
                  </tr>
                `).join('')}
              <tr style="background-color: #f0fdf4;">
                <td colspan="2" style="padding: 12px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold; font-size: 16px;">
                  TOTALE ANIMALI:
                </td>
                <td style="padding: 12px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold; font-size: 16px; color: #16a34a;">
                  ${totalQuantity.toLocaleString('it-IT')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">📊 Riepilogo</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Totale Animali Venduti:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fde68a; font-weight: bold;">${totalQuantity.toLocaleString('it-IT')}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>Peso Totale:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fde68a; font-weight: bold;">${totalWeight.toFixed(2)} kg</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #fde68a;"><strong>N° Sacchi:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #fde68a; font-weight: bold;">${sale.bags?.length || 0}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 5px;">
          <p style="margin: 0; color: #1e40af;">
            📎 <strong>In allegato:</strong> Documento di Trasporto (DDT) in formato PDF
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
          <p>Questa è una email automatica generata dal Sistema FLUPSY</p>
          <p>Il DDT è stato trasmesso correttamente a Fatture in Cloud</p>
        </div>
      </div>
    `;
    
    // Genera PDF DDT
    const pdfBuffer = await generateDDTPdf(saleId);
    
    // Invia email con allegato
    await sendGmailEmail({
      to: recipients,
      subject: `✅ DDT Inviato - ${ddtData.clienteNome || 'Cliente'} - N° ${ddtData.numero} - ${dateFormatted}`,
      html,
      attachments: [{
        filename: `DDT_${ddtData.numero}_${format(new Date(sale.saleDate), 'yyyy-MM-dd')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    
    console.log(`✅ Email conferma DDT inviata a ${recipients.length} destinatari con PDF allegato`);
  } catch (error) {
    console.error('❌ Errore invio email DDT:', error);
    throw error;
  }
}
