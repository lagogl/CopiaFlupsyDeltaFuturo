import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { promisify } from 'util';
import { DATABASE_URL } from './config';

const execPromise = promisify(exec);

// Directory per i backup
const BACKUP_DIR = path.join(process.cwd(), 'database_backups');

// Assicurati che la cartella dei backup esista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupInfo {
  id: string;
  filename: string;
  timestamp: Date;
  size: number;
}

/**
 * Crea un backup del database
 */
export async function createDatabaseBackup(): Promise<BackupInfo> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const filename = `${backupId}.sql`;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    // Estrai informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.slice(1);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    
    // Comando pg_dump con gestione delle credenziali
    const cmd = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} > ${backupPath}`;
    
    await execPromise(cmd);
    
    // Ottieni dimensione del file
    const stats = fs.statSync(backupPath);
    
    return {
      id: backupId,
      filename,
      timestamp: new Date(),
      size: stats.size
    };
  } catch (error) {
    console.error('Errore durante il backup del database:', error);
    throw new Error('Errore durante il backup del database');
  }
}

/**
 * Ripristina il database da un backup
 */
export async function restoreDatabaseFromBackup(backupFilename: string): Promise<boolean> {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // Verifica che il file esista
    if (!fs.existsSync(backupPath)) {
      throw new Error('File di backup non trovato');
    }
    
    // Estrai informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.slice(1);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    
    // Prima esegui una pulizia completa del database esistente
    const pool = new pg.Pool({
      connectionString: DATABASE_URL
    });
    
    try {
      // Disabilita i vincoli di chiave esterna temporaneamente
      await pool.query('SET session_replication_role = replica;');
      
      // Elimina tutte le tabelle pubbliche
      const tableQuery = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public';
      `);
      
      for (const row of tableQuery.rows) {
        await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
      }
      
      // Riattiva i vincoli di chiave esterna
      await pool.query('SET session_replication_role = DEFAULT;');
    } finally {
      await pool.end();
    }
    
    // Comando psql per il ripristino con gestione delle credenziali
    const restoreCmd = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < ${backupPath}`;
    
    await execPromise(restoreCmd);
    return true;
  } catch (error) {
    console.error('Errore durante il ripristino del database:', error);
    throw new Error('Errore durante il ripristino del database');
  }
}

/**
 * Ripristina il database da un file caricato
 */
export async function restoreDatabaseFromUploadedFile(filePath: string): Promise<boolean> {
  try {
    // Verifica che il file esista
    if (!fs.existsSync(filePath)) {
      throw new Error('File di backup non trovato');
    }
    
    // Estrai informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.slice(1);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    
    // Prima esegui una pulizia completa del database esistente
    const pool = new pg.Pool({
      connectionString: DATABASE_URL
    });
    
    try {
      // Disabilita i vincoli di chiave esterna temporaneamente
      await pool.query('SET session_replication_role = replica;');
      
      // Elimina tutte le tabelle pubbliche
      const tableQuery = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public';
      `);
      
      for (const row of tableQuery.rows) {
        await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
      }
      
      // Riattiva i vincoli di chiave esterna
      await pool.query('SET session_replication_role = DEFAULT;');
    } finally {
      await pool.end();
    }
    
    // Comando psql per il ripristino con gestione delle credenziali
    const restoreCmd = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < ${filePath}`;
    
    await execPromise(restoreCmd);
    
    // Elimina il file temporaneo
    fs.unlinkSync(filePath);
    
    return true;
  } catch (error) {
    console.error('Errore durante il ripristino del database:', error);
    
    // Assicurati di rimuovere il file temporaneo in caso di errore
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Errore durante la rimozione del file temporaneo:', e);
      }
    }
    
    throw new Error('Errore durante il ripristino del database');
  }
}

/**
 * Ottieni l'elenco dei backup disponibili
 */
export function getAvailableBackups(): BackupInfo[] {
  try {
    // Leggi i file nella directory dei backup
    const files = fs.readdirSync(BACKUP_DIR);
    
    // Filtra solo i file .sql
    const backupFiles = files.filter(file => file.endsWith('.sql'));
    
    // Costruisci le informazioni per ogni backup
    return backupFiles.map(filename => {
      const stats = fs.statSync(path.join(BACKUP_DIR, filename));
      const id = filename.replace('.sql', '');
      
      return {
        id,
        filename,
        timestamp: stats.mtime,
        size: stats.size
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Ordina per data, più recenti prima
  } catch (error) {
    console.error('Errore durante il recupero dei backup disponibili:', error);
    return [];
  }
}

/**
 * Scarica un backup specifico
 */
export function getBackupFilePath(backupId: string): string | null {
  try {
    const backupFileName = `${backupId}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    if (fs.existsSync(backupPath)) {
      return backupPath;
    }
    
    // Se il backupId non contiene l'estensione, prova direttamente con il nome file
    const alternatePath = path.join(BACKUP_DIR, backupId);
    if (fs.existsSync(alternatePath)) {
      return alternatePath;
    }
    
    return null;
  } catch (error) {
    console.error('Errore durante il recupero del file di backup:', error);
    return null;
  }
}

/**
 * Genera un backup completo del database
 */
export async function generateFullDatabaseDump(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full_database_${timestamp}.sql`;
    const dumpPath = path.join(BACKUP_DIR, filename);
    
    // Estrai informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.slice(1);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    
    // Comando pg_dump con gestione delle credenziali
    const cmd = `PGPASSWORD=${dbPassword} pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${dumpPath}`;
    
    await execPromise(cmd);
    
    return dumpPath;
  } catch (error) {
    console.error('Errore durante la generazione del dump del database:', error);
    throw new Error('Errore durante la generazione del dump del database');
  }
}

/**
 * Elimina un backup specifico
 */
export function deleteBackup(backupId: string): boolean {
  try {
    const backupPath = getBackupFilePath(backupId);
    
    if (!backupPath) {
      throw new Error('Backup non trovato');
    }
    
    fs.unlinkSync(backupPath);
    return true;
  } catch (error) {
    console.error('Errore durante l\'eliminazione del backup:', error);
    return false;
  }
}

/**
 * Pianifica backup automatici
 */
export function scheduleAutomaticBackups(intervalHours = 24): NodeJS.Timeout {
  console.log(`Backup automatico pianificato ogni ${intervalHours} ore`);
  
  // Esegui subito un backup all'avvio
  createDatabaseBackup().catch(err => 
    console.error('Errore durante l\'esecuzione del backup iniziale:', err)
  );
  
  // Pianifica i backup futuri
  return setInterval(async () => {
    try {
      await createDatabaseBackup();
      console.log('Backup automatico completato con successo');
      
      // Pulisci i backup più vecchi di 30 giorni
      cleanupOldBackups(30);
    } catch (error) {
      console.error('Errore durante l\'esecuzione del backup automatico:', error);
    }
  }, intervalHours * 60 * 60 * 1000);
}

/**
 * Pulisce i backup più vecchi di X giorni
 */
function cleanupOldBackups(daysToKeep: number): void {
  try {
    const now = new Date();
    const backups = getAvailableBackups();
    
    backups.forEach(backup => {
      const ageInDays = (now.getTime() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays > daysToKeep) {
        deleteBackup(backup.id);
        console.log(`Backup ${backup.id} eliminato perché più vecchio di ${daysToKeep} giorni`);
      }
    });
  } catch (error) {
    console.error('Errore durante la pulizia dei backup vecchi:', error);
  }
}