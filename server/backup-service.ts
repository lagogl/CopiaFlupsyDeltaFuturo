import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);

// Per ottenere __dirname in moduli ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assicurati che le directory esistano
const backupDir = path.join(__dirname, '../database_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

export interface BackupInfo {
  id: string;
  filename: string;
  timestamp: Date;
  size: number;
}

/**
 * Crea un backup del database
 * @returns Informazioni sul backup creato
 */
export async function createDatabaseBackup(): Promise<BackupInfo> {
  try {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const backupId = uuidv4();
    const filename = `backup_${timestamp}_${backupId}.sql`;
    const backupPath = path.join(backupDir, filename);

    // Usa pg_dump per creare il backup
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL non configurato');
    }

    const connectionString = process.env.DATABASE_URL;
    console.log(`Creazione backup in ${backupPath}`);

    const { stdout, stderr } = await execPromise(`pg_dump "${connectionString}" > "${backupPath}"`);
    
    if (stderr) {
      console.warn('Output stderr da pg_dump:', stderr);
    }

    // Ottieni le informazioni sul file di backup
    const stats = fs.statSync(backupPath);
    
    return {
      id: backupId,
      filename,
      timestamp: new Date(),
      size: stats.size
    };
  } catch (error) {
    console.error('Errore durante la creazione del backup:', error);
    throw new Error(`Errore durante la creazione del backup: ${(error as Error).message}`);
  }
}

/**
 * Ottiene la lista dei backup disponibili
 * @returns Array di informazioni sui backup
 */
export function getAvailableBackups(): BackupInfo[] {
  try {
    const files = fs.readdirSync(backupDir);
    
    return files
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .map(filename => {
        const stats = fs.statSync(path.join(backupDir, filename));
        const parts = filename.split('_');
        const backupId = parts[2].replace('.sql', '');
        
        return {
          id: backupId,
          filename,
          timestamp: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Ordina per data, più recenti prima
  } catch (error) {
    console.error('Errore durante la lettura dei backup disponibili:', error);
    return [];
  }
}

/**
 * Ripristina il database da un file di backup
 * @param backupPath Percorso del file di backup
 * @returns true se il ripristino è avvenuto con successo
 */
export async function restoreDatabaseFromBackup(backupPath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`File di backup non trovato: ${backupPath}`);
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL non configurato');
    }

    const connectionString = process.env.DATABASE_URL;
    console.log(`Ripristino database da ${backupPath}`);

    // Prima crea un backup di sicurezza
    const safetyBackup = await createDatabaseBackup();
    console.log(`Backup di sicurezza creato: ${safetyBackup.filename}`);

    // Esegui il ripristino
    const { stdout, stderr } = await execPromise(`psql "${connectionString}" < "${backupPath}"`);
    
    if (stderr) {
      console.warn('Output stderr da psql:', stderr);
    }

    return true;
  } catch (error) {
    console.error('Errore durante il ripristino del database:', error);
    return false;
  }
}

/**
 * Genera un dump completo del database
 * @returns Percorso del file di dump
 */
export async function generateFullDatabaseDump(): Promise<string> {
  try {
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `dump_${timestamp}.sql`;
    const dumpPath = path.join(backupDir, filename);

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL non configurato');
    }

    const connectionString = process.env.DATABASE_URL;
    console.log(`Generazione dump completo in ${dumpPath}`);

    const { stdout, stderr } = await execPromise(`pg_dump "${connectionString}" > "${dumpPath}"`);
    
    if (stderr) {
      console.warn('Output stderr da pg_dump:', stderr);
    }

    return dumpPath;
  } catch (error) {
    console.error('Errore durante la generazione del dump completo:', error);
    throw new Error(`Errore durante la generazione del dump: ${(error as Error).message}`);
  }
}