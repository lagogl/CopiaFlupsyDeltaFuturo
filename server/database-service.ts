/**
 * Database Service
 * 
 * Questo servizio gestisce operazioni di backup e ripristino del database
 */

import { DATABASE_URL, BACKUP_RETENTION_DAYS } from './config';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execPromise = promisify(exec);

// Directory per i backup
const BACKUP_DIR = path.resolve('./database_backups');

// Assicurati che la directory di backup esista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Directory di backup creata: ${BACKUP_DIR}`);
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
    const backupId = randomUUID();
    const timestamp = new Date();
    const formattedDate = timestamp.toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `backup_${formattedDate}_${backupId.substring(0, 8)}.sql`;
    const filePath = path.join(BACKUP_DIR, filename);
    
    // Estrai le informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.substring(1);
    
    // Comando pg_dump
    const command = [
      `PGPASSWORD="${dbPassword}" pg_dump`,
      `-h ${dbHost}`,
      `-p ${dbPort}`,
      `-U ${dbUser}`,
      `-d ${dbName}`,
      `-f "${filePath}"`,
      `--format=p`,
      `--no-owner`,
      `--no-acl`
    ].join(' ');
    
    // Esegui pg_dump
    console.log(`Avvio backup del database in: ${filePath}`);
    await execPromise(command);
    
    const stats = fs.statSync(filePath);
    
    const backupInfo: BackupInfo = {
      id: backupId,
      filename: filename,
      timestamp: timestamp,
      size: stats.size
    };
    
    console.log(`Backup completato: ${filename}, Dimensione: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    return backupInfo;
  } catch (error) {
    console.error('Errore durante la creazione del backup:', error);
    throw new Error(`Errore durante la creazione del backup: ${(error as Error).message}`);
  }
}

/**
 * Ripristina il database da un backup
 */
export async function restoreDatabaseFromBackup(backupFilename: string): Promise<boolean> {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`Il file di backup non esiste: ${backupPath}`);
      return false;
    }
    
    // Estrai le informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.substring(1);
    
    // Comando psql
    const command = [
      `PGPASSWORD="${dbPassword}" psql`,
      `-h ${dbHost}`,
      `-p ${dbPort}`,
      `-U ${dbUser}`,
      `-d ${dbName}`,
      `-f "${backupPath}"`
    ].join(' ');
    
    console.log(`Avvio ripristino del database da: ${backupPath}`);
    await execPromise(command);
    
    console.log('Ripristino completato con successo');
    return true;
  } catch (error) {
    console.error('Errore durante il ripristino del database:', error);
    return false;
  }
}

/**
 * Ripristina il database da un file caricato
 */
export async function restoreDatabaseFromUploadedFile(filePath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Il file caricato non esiste: ${filePath}`);
      return false;
    }
    
    // Estrai le informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.substring(1);
    
    // Comando psql
    const command = [
      `PGPASSWORD="${dbPassword}" psql`,
      `-h ${dbHost}`,
      `-p ${dbPort}`,
      `-U ${dbUser}`,
      `-d ${dbName}`,
      `-f "${filePath}"`
    ].join(' ');
    
    console.log(`Avvio ripristino del database da file caricato: ${filePath}`);
    await execPromise(command);
    
    console.log('Ripristino da file caricato completato con successo');
    return true;
  } catch (error) {
    console.error('Errore durante il ripristino da file caricato:', error);
    return false;
  }
}

/**
 * Ottieni l'elenco dei backup disponibili
 */
export function getAvailableBackups(): BackupInfo[] {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(BACKUP_DIR);
    
    const backups: BackupInfo[] = files
      .filter(file => file.endsWith('.sql'))
      .map(filename => {
        const fullPath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(fullPath);
        
        // Estrai l'ID e la data dal nome del file
        const matches = filename.match(/backup_(.+)_([a-f0-9]{8})\.sql/);
        const dateStr = matches ? matches[1].replace(/-/g, ':') : '';
        const id = matches ? matches[2] : randomUUID().substring(0, 8);
        
        return {
          id: id,
          filename: filename,
          timestamp: dateStr ? new Date(dateStr) : stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Ordina per data decrescente
    
    return backups;
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
    const backups = getAvailableBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return null;
    }
    
    return path.join(BACKUP_DIR, backup.filename);
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
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const tempFilePath = path.join(BACKUP_DIR, `temp_dump_${timestamp}.sql`);
    
    // Estrai le informazioni di connessione dall'URL
    const dbUrl = new URL(DATABASE_URL);
    const dbUser = dbUrl.username;
    const dbPassword = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port;
    const dbName = dbUrl.pathname.substring(1);
    
    // Comando pg_dump
    const command = [
      `PGPASSWORD="${dbPassword}" pg_dump`,
      `-h ${dbHost}`,
      `-p ${dbPort}`,
      `-U ${dbUser}`,
      `-d ${dbName}`,
      `-f "${tempFilePath}"`,
      `--format=p`,
      `--no-owner`,
      `--no-acl`
    ].join(' ');
    
    // Esegui pg_dump
    console.log(`Generazione dump completo del database in: ${tempFilePath}`);
    await execPromise(command);
    
    return tempFilePath;
  } catch (error) {
    console.error('Errore durante la generazione del dump completo:', error);
    throw new Error(`Errore durante la generazione del dump completo: ${(error as Error).message}`);
  }
}

/**
 * Elimina un backup specifico
 */
export function deleteBackup(backupId: string): boolean {
  try {
    const backups = getAvailableBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return false;
    }
    
    const filePath = path.join(BACKUP_DIR, backup.filename);
    fs.unlinkSync(filePath);
    
    console.log(`Backup eliminato: ${backup.filename}`);
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
  console.log(`Pianificazione backup automatici ogni ${intervalHours} ore`);
  
  // Esegui subito il primo backup
  setTimeout(() => {
    createDatabaseBackup()
      .then(() => {
        console.log('Backup automatico iniziale completato con successo');
        // Pulisci i backup vecchi
        cleanupOldBackups(BACKUP_RETENTION_DAYS);
      })
      .catch(err => {
        console.error('Errore durante il backup automatico iniziale:', err);
      });
  }, 1000 * 60 * 5); // Attendi 5 minuti all'avvio
  
  // Pianifica backup periodici
  const interval = intervalHours * 60 * 60 * 1000; // millisecondi
  
  return setInterval(() => {
    createDatabaseBackup()
      .then(() => {
        console.log('Backup automatico periodico completato con successo');
        // Pulisci i backup vecchi
        cleanupOldBackups(BACKUP_RETENTION_DAYS);
      })
      .catch(err => {
        console.error('Errore durante il backup automatico periodico:', err);
      });
  }, interval);
}

/**
 * Pulisce i backup più vecchi di X giorni
 */
function cleanupOldBackups(daysToKeep: number): void {
  try {
    console.log(`Pulizia backup più vecchi di ${daysToKeep} giorni`);
    
    const backups = getAvailableBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;
    
    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) {
        const filePath = path.join(BACKUP_DIR, backup.filename);
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    console.log(`Pulizia backup completata. Eliminati ${deletedCount} backup obsoleti.`);
  } catch (error) {
    console.error('Errore durante la pulizia dei backup obsoleti:', error);
  }
}