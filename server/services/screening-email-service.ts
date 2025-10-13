import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { sendGmailEmail, getEmailRecipients } from './gmail-service';

/**
 * Invia email di conferma vagliatura con dettaglio completo
 */
export async function sendScreeningConfirmationEmail(screeningData: any): Promise<void> {
  try {
    const recipients = await getEmailRecipients();
    
    if (recipients.length === 0) {
      console.log('⚠️ Nessun destinatario configurato per email vagliature');
      return;
    }
    
    const dateFormatted = format(new Date(screeningData.date), 'dd/MM/yyyy', { locale: it });
    
    // Costruisci HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          ✅ Conferma Vagliatura - ${dateFormatted}
        </h2>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin-top: 0;">📍 Informazioni Generali</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>Data:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${dateFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>FLUPSY:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${screeningData.flupsyName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>Ubicazione:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${screeningData.flupsyLocation || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;"><strong>Tipo Vagliatura:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #bae6fd;">${screeningData.type === 'normal' ? 'Normale' : 'Finale (con chiusura ciclo)'}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">📦 Cestelli Origine</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #fde68a;">
                <th style="padding: 10px; text-align: left; border: 1px solid #fcd34d;">Cestello</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #fcd34d;">Taglia</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #fcd34d;">Quantità</th>
              </tr>
            </thead>
            <tbody>
              ${screeningData.sourceBaskets?.map((basket: any) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #fcd34d;">
                    <strong>#${basket.basketNumber}</strong>
                  </td>
                  <td style="padding: 10px; border: 1px solid #fcd34d;">
                    <span style="background-color: #dbeafe; padding: 4px 8px; border-radius: 3px;">
                      ${basket.sizeCode}
                    </span>
                  </td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #fcd34d; font-weight: bold;">
                    ${basket.animalCount.toLocaleString('it-IT')}
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="3" style="padding: 10px; text-align: center;">Nessun cestello origine</td></tr>'}
              <tr style="background-color: #fde68a; font-weight: bold;">
                <td colspan="2" style="padding: 10px; border: 1px solid #fcd34d; text-align: right;">TOTALE ORIGINE:</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #fcd34d; font-size: 16px;">
                  ${(screeningData.totalOrigin || 0).toLocaleString('it-IT')} animali
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #475569; margin-top: 0;">📊 Risultati Vagliatura per Taglia</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #e2e8f0;">
                <th style="padding: 10px; text-align: left; border: 1px solid #cbd5e1;">Taglia</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Quantità</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">Peso Medio (g)</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #cbd5e1;">Utilizzo</th>
              </tr>
            </thead>
            <tbody>
              ${screeningData.results.map((result: any) => {
                let destinationText = 'N/A';
                let destinationStyle = 'background-color: #f1f5f9;';
                
                if (result.destination === 'sale') {
                  destinationText = '💰 <strong>VENDITA IMMEDIATA</strong>';
                  destinationStyle = 'background-color: #dcfce7; color: #166534;';
                } else if (result.destination === 'basket') {
                  destinationText = `📍 <strong>RIPOSIZIONATO</strong> in Cestello #${result.targetBasketNumber}`;
                  destinationStyle = 'background-color: #dbeafe; color: #1e40af;';
                } else if (result.destination === 'discard') {
                  destinationText = '❌ <strong>SCARTO</strong>';
                  destinationStyle = 'background-color: #fee2e2; color: #991b1b;';
                }
                
                return `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1;">
                      <span style="background-color: #dbeafe; padding: 4px 8px; border-radius: 3px; font-weight: bold;">
                        ${result.sizeCode}
                      </span>
                    </td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1; font-weight: bold;">
                      ${result.quantity.toLocaleString('it-IT')}
                    </td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #cbd5e1;">
                      ${result.averageWeight ? result.averageWeight.toFixed(2) : 'N/A'}
                    </td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #cbd5e1; ${destinationStyle}">
                      ${destinationText}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="background-color: #ede9fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #5b21b6; margin-top: 0;">📈 Riepilogo Finale</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd6fe;"><strong>Totale Origine:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold;">
                ${(screeningData.totalOrigin || 0).toLocaleString('it-IT')} animali
              </td>
            </tr>
            ${screeningData.mortality > 0 ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe;"><strong>💀 Mortalità:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; color: #dc2626;">
                  ${screeningData.mortality.toLocaleString('it-IT')} animali
                </td>
              </tr>
            ` : ''}
            ${screeningData.totalSold > 0 ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe;"><strong>💰 Vendita Immediata:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; color: #15803d;">
                  ${screeningData.totalSold.toLocaleString('it-IT')} animali
                </td>
              </tr>
            ` : ''}
            ${screeningData.totalRepositioned > 0 ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe;"><strong>📍 Riposizionati:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; color: #1e40af;">
                  ${screeningData.totalRepositioned.toLocaleString('it-IT')} animali
                </td>
              </tr>
            ` : ''}
            ${screeningData.totalDiscarded > 0 ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe;"><strong>❌ Scarto:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd6fe; text-align: right; font-weight: bold; color: #991b1b;">
                  ${screeningData.totalDiscarded.toLocaleString('it-IT')} animali
                </td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        ${screeningData.notes ? `
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">📝 Note</h3>
            <p style="margin: 0; white-space: pre-wrap;">${screeningData.notes}</p>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
          <p>Questa è una email automatica generata dal Sistema FLUPSY</p>
        </div>
      </div>
    `;
    
    await sendGmailEmail({
      to: recipients,
      subject: `✅ Conferma Vagliatura - ${screeningData.flupsyName} #${screeningData.basketNumber} - ${dateFormatted}`,
      html
    });
    
    console.log(`✅ Email conferma vagliatura inviata a ${recipients.length} destinatari`);
  } catch (error) {
    console.error('❌ Errore invio email vagliatura:', error);
    throw error;
  }
}
