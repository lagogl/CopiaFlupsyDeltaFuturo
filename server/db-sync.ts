/**
 * Sistema di sincronizzazione database
 * 
 * Questo modulo gestisce la sincronizzazione tra database locale e remoto
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import { db as localDb, queryClient as localPool } from './db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Directory per i backup
const BACKUP_DIR = path.join(process.cwd(), 'database_backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Connessione al database remoto (quando necessario)
let remotePool: Pool | null = null;
let remoteDb: any | null = null;

// Inizializza la connessione al database remoto
export function initRemoteDb(remoteUrl: string) {
  if (!remoteUrl) {
    throw new Error('URL del database remoto non specificato');
  }
  
  remotePool = new Pool({ connectionString: remoteUrl });
  remoteDb = drizzle({ client: remotePool, schema });
  
  return { remoteDb, remotePool };
}

// Backup del database locale
export async function backupLocalDatabase() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(BACKUP_DIR, `local_backup_${timestamp}.sql`);
    
    // Crea il backup in un formato più semplice
    // Ottieni l'elenco delle tabelle
    const tablesResult = await localDb.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    
    const tableNames = tablesResult.map((row: any) => row.table_name);
    
    // Prepara il file di backup
    let backupContent = `-- Database backup created on ${new Date().toISOString()}\n\n`;
    
    // Per ogni tabella, esegui un dump dei dati
    for (const tableName of tableNames) {
      const tableData = await localDb.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
      
      if (tableData.length > 0) {
        backupContent += `-- Table: ${tableName}\n`;
        backupContent += JSON.stringify(tableData, null, 2);
        backupContent += '\n\n';
      }
    }
    
    // Scrivi il backup su file
    fs.writeFileSync(backupFilePath, backupContent);
    
    console.log(`Backup creato: ${backupFilePath}`);
    return backupFilePath;
  } catch (error) {
    console.error('Errore durante il backup del database locale:', error);
    throw error;
  }
}

// Sincronizza dal database remoto al database locale
export async function syncFromRemote(remoteUrl: string) {
  try {
    // Backup del database locale prima della sincronizzazione
    await backupLocalDatabase();
    
    // Inizializza connessione remota se non esistente
    if (!remoteDb) {
      initRemoteDb(remoteUrl);
    }
    
    // Recupera tutte le tabelle dallo schema
    const tables = Object.keys(schema)
      .filter(key => typeof schema[key] === 'object' && 'name' in schema[key]);
    
    for (const tableName of tables) {
      const table = schema[tableName];
      
      // Recupera tutti i record dalla tabella remota
      const remoteRecords = await remoteDb.select().from(table);
      
      // Elimina tutti i record dalla tabella locale
      await localDb.delete(table);
      
      // Inserisci i record remoti nella tabella locale
      if (remoteRecords.length > 0) {
        await localDb.insert(table).values(remoteRecords);
      }
      
      console.log(`Tabella ${tableName} sincronizzata: ${remoteRecords.length} record`);
    }
    
    return { success: true, message: 'Sincronizzazione dal remoto completata' };
  } catch (error) {
    console.error('Errore durante la sincronizzazione dal database remoto:', error);
    throw error;
  } finally {
    // Chiudi la connessione al database remoto
    if (remotePool) {
      await remotePool.end();
      remotePool = null;
      remoteDb = null;
    }
  }
}

// Sincronizza dal database locale al database remoto
export async function syncToRemote(remoteUrl: string) {
  try {
    // Inizializza connessione remota se non esistente
    if (!remoteDb) {
      initRemoteDb(remoteUrl);
    }
    
    // Recupera tutte le tabelle dallo schema
    const tables = Object.keys(schema)
      .filter(key => typeof schema[key] === 'object' && 'name' in schema[key]);
    
    for (const tableName of tables) {
      const table = schema[tableName];
      
      // Recupera tutti i record dalla tabella locale
      const localRecords = await localDb.select().from(table);
      
      // Elimina tutti i record dalla tabella remota
      await remoteDb.delete(table);
      
      // Inserisci i record locali nella tabella remota
      if (localRecords.length > 0) {
        await remoteDb.insert(table).values(localRecords);
      }
      
      console.log(`Tabella ${tableName} sincronizzata: ${localRecords.length} record`);
    }
    
    return { success: true, message: 'Sincronizzazione verso il remoto completata' };
  } catch (error) {
    console.error('Errore durante la sincronizzazione verso il database remoto:', error);
    throw error;
  } finally {
    // Chiudi la connessione al database remoto
    if (remotePool) {
      await remotePool.end();
      remotePool = null;
      remoteDb = null;
    }
  }
}