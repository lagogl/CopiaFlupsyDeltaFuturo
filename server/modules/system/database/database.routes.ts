/**
 * Route per il modulo gestione database
 */

import { Router } from 'express';
import { databaseController } from './database.controller';

const router = Router();

// Backup management
router.post('/backup', (req, res) => databaseController.createBackup(req, res));
router.get('/backups', (req, res) => databaseController.getBackups(req, res));
router.post('/restore/:backupId', (req, res) => databaseController.restoreFromBackup(req, res));
router.post('/restore', (req, res) => databaseController.restoreFromFile(req, res));
router.delete('/backups/:backupId', (req, res) => databaseController.deleteBackup(req, res));

// Database operations
router.get('/download', (req, res) => databaseController.downloadDump(req, res));
router.get('/integrity-check', (req, res) => databaseController.checkIntegrity(req, res));
router.get('-snapshot', (req, res) => databaseController.getSnapshot(req, res));

export default router;
