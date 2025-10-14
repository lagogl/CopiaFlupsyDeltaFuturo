/**
 * Modulo per gestione database: backup, restore, export
 */
import { Router, Request, Response } from "express";
import { sendError, sendSuccess } from "../../../utils/error-handler";
import { 
  createDatabaseBackup, 
  getAvailableBackups, 
  restoreDatabaseFromBackup 
} from "../../../database-service";
import { storage } from "../../../storage";
import path from "path";
import fs from "fs";

export const databaseManagementRoutes = Router();

/**
 * Endpoint per l'esportazione delle giacenze
 * Esporta i dati in formato JSON strutturato
 */
databaseManagementRoutes.get('/export/giacenze', async (req: Request, res: Response) => {
  try {
    // Importa il servizio di esportazione on-demand
    const { generateExportGiacenze } = await import("../../../export-service");
    
    // Recupera i parametri opzionali dalla query
    const fornitore = req.query.fornitore as string || undefined;
    const dataEsportazione = req.query.data ? new Date(req.query.data as string) : undefined;
    
    // Genera il JSON di esportazione (passa storage con cast)
    const giacenzeJson = await generateExportGiacenze(storage as any, {
      fornitore,
      dataEsportazione
    });
    
    // Imposta header per il download del file
    const filename = `giacenze_export_${new Date().toISOString().split('T')[0]}.json`;
    
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/json');
    }
    
    // Invia il JSON formattato
    res.json(giacenzeJson);
    
  } catch (error) {
    console.error("Errore durante l'esportazione delle giacenze:", error);
    return sendError(res, error, "Si è verificato un errore durante l'esportazione delle giacenze");
  }
});

/**
 * Crea un nuovo backup del database
 * Salva lo stato corrente del database in un file SQL
 */
databaseManagementRoutes.post('/database/backup', async (req: Request, res: Response) => {
  try {
    console.log('🗄️ Creazione backup database in corso...');
    
    const backup = await createDatabaseBackup();
    
    console.log(`✅ Backup creato con successo: ${backup.id}`);
    
    return sendSuccess(res, {
      backupId: backup.id,
      timestamp: backup.timestamp,
      size: backup.size
    }, "Backup database creato con successo");
    
  } catch (error) {
    console.error("Errore durante la creazione del backup:", error);
    return sendError(res, error, "Errore durante la creazione del backup");
  }
});

/**
 * Ottiene la lista dei backup disponibili
 * Mostra tutti i backup salvati con relativi dettagli
 */
databaseManagementRoutes.get('/database/backups', (req: Request, res: Response) => {
  try {
    console.log('📋 Recupero lista backup disponibili...');
    
    const backups = getAvailableBackups();
    
    console.log(`✅ Trovati ${backups.length} backup disponibili`);
    
    res.json(backups);
    
  } catch (error) {
    console.error("Errore durante il recupero dei backup:", error);
    return sendError(res, error, "Errore durante il recupero dei backup");
  }
});

/**
 * Ripristina il database da un backup esistente
 * @param backupId - ID univoco del backup da ripristinare
 */
databaseManagementRoutes.post('/database/restore/:backupId', async (req: Request, res: Response) => {
  try {
    const backupId = req.params.backupId;
    console.log(`🔄 Richiesta ripristino backup con ID: ${backupId}`);
    
    // Ottieni la lista dei backup disponibili
    const backups = getAvailableBackups();
    
    // Trova il backup con l'ID fornito
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      console.error(`❌ Backup non trovato con ID: ${backupId}`);
      return res.status(404).json({ 
        success: false, 
        message: "Backup non trovato. Verifica l'ID del backup." 
      });
    }
    
    console.log(`📂 Backup trovato: ${backup.filename}`);
    console.log(`⚠️  ATTENZIONE: Ripristino database in corso - TUTTI I DATI ATTUALI SARANNO SOVRASCRITTI`);
    
    // Ripristina il database dal file di backup
    const result = await restoreDatabaseFromBackup(backup.filename);
    
    if (result) {
      console.log('✅ Database ripristinato con successo');
      return sendSuccess(res, { 
        restored: true,
        backupId,
        filename: backup.filename 
      }, "Database ripristinato con successo");
    } else {
      throw new Error("Errore durante il ripristino del database");
    }
    
  } catch (error) {
    console.error("Errore durante il ripristino del database:", error);
    return sendError(res, error, "Errore durante il ripristino del database");
  }
});

/**
 * Ripristina il database da un file SQL caricato
 * Accetta contenuto SQL in formato base64
 */
databaseManagementRoutes.post('/database/restore', async (req: Request, res: Response) => {
  try {
    const { sqlContent, fileName } = req.body;
    
    if (!sqlContent) {
      return res.status(400).json({ 
        success: false, 
        message: "Nessun contenuto SQL fornito" 
      });
    }
    
    console.log(`📤 Ricevuto file di backup: ${fileName}`);
    
    // Decodifica il contenuto da base64
    const sqlBuffer = Buffer.from(sqlContent, 'base64');
    
    // Crea una directory temporanea per il file SQL se non esiste
    const uploadDir = path.join(__dirname, '../../../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Crea un nome file unico
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizza il nome file
    const filePath = path.join(uploadDir, `${timestamp}-${safeName}`);
    
    // Scrivi il file
    fs.writeFileSync(filePath, sqlBuffer);
    
    console.log(`💾 File salvato temporaneamente: ${filePath}`);
    console.log(`⚠️  ATTENZIONE: Ripristino database in corso - TUTTI I DATI ATTUALI SARANNO SOVRASCRITTI`);
    
    // Ripristina il database dal file caricato
    const result = await restoreDatabaseFromBackup(filePath);
    
    // Rimuovi il file temporaneo
    try {
      fs.unlinkSync(filePath);
      console.log('🗑️ File temporaneo rimosso');
    } catch (cleanupError) {
      console.warn('⚠️ Impossibile rimuovere il file temporaneo:', cleanupError);
    }
    
    if (result) {
      console.log('✅ Database ripristinato con successo da file caricato');
      return sendSuccess(res, { 
        restored: true,
        fileName 
      }, "Database ripristinato con successo dal file caricato");
    } else {
      throw new Error("Errore durante il ripristino del database dal file");
    }
    
  } catch (error) {
    console.error("Errore durante il ripristino del database:", error);
    return sendError(res, error, "Errore durante il ripristino del database dal file caricato");
  }
});