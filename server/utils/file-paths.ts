/**
 * Utility per gestione centralizzata dei percorsi file nell'applicazione
 */
import path from 'path';
import fs from 'fs';

/**
 * Ottiene la directory per l'upload dei backup, creandola se non esiste
 * @returns Il percorso assoluto della directory backup
 */
export function getBackupUploadDir(): string {
  const uploadDir = path.join(process.cwd(), 'uploads/backups');
  
  // Assicurati che la directory esista
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return uploadDir;
}

/**
 * Ottiene la directory per i file temporanei
 * @returns Il percorso assoluto della directory temp
 */
export function getTempDir(): string {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
}

/**
 * Ottiene la directory per i log
 * @returns Il percorso assoluto della directory log
 */
export function getLogsDir(): string {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  return logsDir;
}

/**
 * Ottiene la directory per i report esportati
 * @returns Il percorso assoluto della directory exports
 */
export function getExportsDir(): string {
  const exportsDir = path.join(process.cwd(), 'exports');
  
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
  
  return exportsDir;
}

/**
 * Genera un nome file unico basato su timestamp
 * @param prefix - Prefisso del nome file
 * @param extension - Estensione del file (senza punto)
 * @returns Nome file unico
 */
export function generateUniqueFileName(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Verifica se un percorso è sicuro (previene path traversal)
 * @param basePath - Percorso base consentito
 * @param userPath - Percorso fornito dall'utente
 * @returns true se il percorso è sicuro
 */
export function isPathSafe(basePath: string, userPath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedUser = path.resolve(basePath, userPath);
  return resolvedUser.startsWith(resolvedBase);
}