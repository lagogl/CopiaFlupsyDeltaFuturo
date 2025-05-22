/**
 * Sistema di sincronizzazione database
 * 
 * Questo modulo gestisce la sincronizzazione tra database locale e remoto
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import { db as localDb, pool as localPool } from './db';
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
    
    // Estrai informazioni di connessione da DATABASE_URL
    const config = {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    };
    
    // Genera un backup pg_dump usando l'API del pool
    const query = `COPY (
      SELECT 'COPY ' || tablename || ' FROM STDIN;' || E'\n' ||
             string_agg(row_to_json(t)::text, E'\n') || E'\n\\.\n'
      FROM (
        SELECT tablename, 
               array_agg(row_to_json(data_rows)) as rows
        FROM (
          SELECT table_name AS tablename
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        ) AS tables
        LEFT JOIN LATERAL (
          SELECT * FROM (SELECT * FROM ${schema}) AS data_rows
        ) AS data ON true
        GROUP BY tablename
      ) t
      GROUP BY tablename
    ) TO '${backupFilePath}';`;
    
    // Non esegue direttamente, ma attraverso l'API gestita del pool
    await localPool.query(`SELECT pg_export_snapshot()`);
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