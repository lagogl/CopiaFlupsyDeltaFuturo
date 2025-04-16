// Configurazioni varie dell'applicazione
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const AUTO_BACKUP_ENABLED = process.env.AUTO_BACKUP_ENABLED !== 'false'; // Abilitato di default
export const AUTO_BACKUP_INTERVAL_HOURS = parseInt(process.env.AUTO_BACKUP_INTERVAL_HOURS || '24', 10);
export const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);