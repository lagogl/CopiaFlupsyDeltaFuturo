import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Invia email usando Gmail API
 */
export async function sendGmailEmail(options: EmailOptions): Promise<void> {
  try {
    const gmail = await getUncachableGmailClient();
    
    // Converti destinatari in array se stringa
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    
    // Costruisci il messaggio MIME
    let message = [
      `To: ${recipients.join(', ')}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${options.subject}`,
      '',
      options.html || options.text || ''
    ].join('\n');
    
    // Se ci sono allegati, usa multipart
    if (options.attachments && options.attachments.length > 0) {
      const boundary = 'boundary_' + Date.now();
      
      message = [
        `To: ${recipients.join(', ')}`,
        'MIME-Version: 1.0',
        `Subject: ${options.subject}`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        options.html || options.text || '',
        ''
      ];
      
      // Aggiungi allegati
      for (const attachment of options.attachments) {
        const contentType = attachment.contentType || 'application/octet-stream';
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64');
        
        message.push(`--${boundary}`);
        message.push(`Content-Type: ${contentType}`);
        message.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        message.push('Content-Transfer-Encoding: base64');
        message.push('');
        message.push(content);
        message.push('');
      }
      
      message.push(`--${boundary}--`);
      message = message.join('\n');
    }
    
    // Codifica in base64url
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Invia email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log('✅ Email inviata con successo via Gmail API');
  } catch (error) {
    console.error('❌ Errore invio email Gmail:', error);
    throw error;
  }
}

/**
 * Ottiene i destinatari configurati per le email dal database
 */
export async function getEmailRecipients(): Promise<string[]> {
  try {
    const { db } = await import('../db');
    const { emailConfig } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const config = await db
      .select()
      .from(emailConfig)
      .where(eq(emailConfig.key, 'email_recipients'));
    
    if (config.length > 0 && config[0].value) {
      return config[0].value.split(',').map(email => email.trim()).filter(email => email.length > 0);
    }
    
    return [];
  } catch (error) {
    console.error('Errore recupero destinatari email:', error);
    return [];
  }
}
