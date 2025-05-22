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
    const backupPath = await backupLocalDatabase();
    console.log(`Backup creato con successo in: ${backupPath}`);
    
    // Inizializza connessione remota se non esistente
    if (!remoteDb) {
      const { remoteDb: newRemoteDb } = initRemoteDb(remoteUrl);
      remoteDb = newRemoteDb;
    }
    
    // Recupera tutte le tabelle dallo schema
    const tables = Object.entries(schema)
      .filter(([_, value]) => typeof value === 'object' && 'name' in value)
      .map(([name, table]) => ({ 
        name, 
        table: table as any
      }));
    
    console.log(`Sincronizzazione in corso per ${tables.length} tabelle`);
    
    for (const { name, table } of tables) {
      try {
        console.log(`Sincronizzazione tabella: ${table.name}`);
        
        // Recupera tutti i record dalla tabella remota
        const remoteRecords = await remoteDb.select().from(table);
        
        // Per ogni record, rimuovi eventuali proprietà problematiche (come oggetti date o bigint)
        const sanitizedRecords = remoteRecords.map(record => {
          const sanitized = { ...record };
          // Converti date in ISO string
          Object.keys(sanitized).forEach(key => {
            if (sanitized[key] instanceof Date) {
              sanitized[key] = sanitized[key].toISOString();
            }
            // Converti BigInt in string
            if (typeof sanitized[key] === 'bigint') {
              sanitized[key] = sanitized[key].toString();
            }
          });
          return sanitized;
        });
        
        // Elimina tutti i record dalla tabella locale
        await localDb.delete(table);
        
        // Inserisci i record remoti nella tabella locale
        if (sanitizedRecords.length > 0) {
          // Inserisci a gruppi di 100 per evitare problemi con query troppo grandi
          const chunkSize = 100;
          for (let i = 0; i < sanitizedRecords.length; i += chunkSize) {
            const chunk = sanitizedRecords.slice(i, i + chunkSize);
            await localDb.insert(table).values(chunk);
          }
        }
        
        console.log(`Tabella ${name} sincronizzata: ${remoteRecords.length} record`);
      } catch (err) {
        console.error(`Errore durante la sincronizzazione della tabella ${name}:`, err);
        // Continua con le altre tabelle
      }
    }
    
    return { success: true, message: 'Sincronizzazione dal remoto completata' };
  } catch (error) {
    console.error('Errore durante la sincronizzazione dal database remoto:', error);
    return { 
      success: false, 
      message: `Errore durante la sincronizzazione: ${error instanceof Error ? error.message : String(error)}` 
    };
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
      const { remoteDb: newRemoteDb } = initRemoteDb(remoteUrl);
      remoteDb = newRemoteDb;
    }
    
    // Recupera tutte le tabelle dallo schema
    const tables = Object.entries(schema)
      .filter(([_, value]) => typeof value === 'object' && 'name' in value)
      .map(([name, table]) => ({ 
        name, 
        table: table as any
      }));
    
    console.log(`Sincronizzazione verso remoto in corso per ${tables.length} tabelle`);
    
    for (const { name, table } of tables) {
      try {
        console.log(`Sincronizzazione tabella remota: ${table.name}`);
        
        // Recupera tutti i record dalla tabella locale
        const localRecords = await localDb.select().from(table);
        
        // Per ogni record, rimuovi eventuali proprietà problematiche (come oggetti date o bigint)
        const sanitizedRecords = localRecords.map(record => {
          const sanitized = { ...record };
          // Converti date in ISO string
          Object.keys(sanitized).forEach(key => {
            if (sanitized[key] instanceof Date) {
              sanitized[key] = sanitized[key].toISOString();
            }
            // Converti BigInt in string
            if (typeof sanitized[key] === 'bigint') {
              sanitized[key] = sanitized[key].toString();
            }
          });
          return sanitized;
        });
        
        // Elimina tutti i record dalla tabella remota
        await remoteDb.delete(table);
        
        // Inserisci i record locali nella tabella remota
        if (sanitizedRecords.length > 0) {
          // Inserisci a gruppi di 100 per evitare problemi con query troppo grandi
          const chunkSize = 100;
          for (let i = 0; i < sanitizedRecords.length; i += chunkSize) {
            const chunk = sanitizedRecords.slice(i, i + chunkSize);
            await remoteDb.insert(table).values(chunk);
          }
        }
        
        console.log(`Tabella remota ${name} sincronizzata: ${localRecords.length} record`);
      } catch (err) {
        console.error(`Errore durante la sincronizzazione remota della tabella ${name}:`, err);
        // Continua con le altre tabelle
      }
    }
    
    return { success: true, message: 'Sincronizzazione verso il remoto completata' };
  } catch (error) {
    console.error('Errore durante la sincronizzazione verso il database remoto:', error);
    return { 
      success: false, 
      message: `Errore durante la sincronizzazione: ${error instanceof Error ? error.message : String(error)}` 
    };
  } finally {
    // Chiudi la connessione al database remoto
    if (remotePool) {
      await remotePool.end();
      remotePool = null;
      remoteDb = null;
    }
  }
}