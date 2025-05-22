/**
 * Controller per la gestione della sincronizzazione del database
 */
import { Request, Response } from 'express';
import * as dbSync from '../db-sync';
import fs from 'fs';
import path from 'path';

// Directory per i backup
const BACKUP_DIR = path.join(process.cwd(), 'database_backups');

/**
 * Ottieni l'elenco dei backup disponibili
 */
export async function getBackups(req: Request, res: Response) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        return {
          fileName: file,
          createdAt: stats.birthtime,
          sizeBytes: stats.size,
          sizeFormatted: formatFileSize(stats.size)
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Più recenti prima
    
    return res.json({ success: true, backups: files });
  } catch (error) {
    console.error('Errore durante il recupero dei backup:', error);
    return res.status(500).json({ success: false, error: 'Errore durante il recupero dei backup' });
  }
}

/**
 * Crea un backup del database locale
 */
export async function createBackup(req: Request, res: Response) {
  try {
    const backupPath = await dbSync.backupLocalDatabase();
    
    return res.json({ 
      success: true, 
      message: 'Backup creato con successo', 
      backupPath 
    });
  } catch (error) {
    console.error('Errore durante la creazione del backup:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Errore durante la creazione del backup' 
    });
  }
}

/**
 * Sincronizza dal database remoto al database locale
 */
export async function syncFromRemote(req: Request, res: Response) {
  try {
    const { remoteUrl } = req.body;
    
    if (!remoteUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL del database remoto non specificato' 
      });
    }
    
    const result = await dbSync.syncFromRemote(remoteUrl);
    
    return res.json({ 
      success: true, 
      message: 'Sincronizzazione completata',
      details: result
    });
  } catch (error) {
    console.error('Errore durante la sincronizzazione dal remoto:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Errore durante la sincronizzazione dal remoto' 
    });
  }
}

/**
 * Sincronizza dal database locale al database remoto
 */
export async function syncToRemote(req: Request, res: Response) {
  try {
    const { remoteUrl } = req.body;
    
    if (!remoteUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL del database remoto non specificato' 
      });
    }
    
    const result = await dbSync.syncToRemote(remoteUrl);
    
    return res.json({ 
      success: true, 
      message: 'Sincronizzazione completata',
      details: result
    });
  } catch (error) {
    console.error('Errore durante la sincronizzazione verso il remoto:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Errore durante la sincronizzazione verso il remoto' 
    });
  }
}

/**
 * Utility per formattare la dimensione del file
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}