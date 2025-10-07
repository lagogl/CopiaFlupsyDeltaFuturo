/**
 * Controller per gli endpoint di gestione database
 */

import { Request, Response } from 'express';
import { databaseService } from './database.service';
import { checkDatabaseIntegrityHandler } from '../../../controllers/database-integrity-controller';
import * as fs from 'fs';
import * as path from 'path';

const getBackupUploadDir = () => {
  const uploadDir = path.join(process.cwd(), 'uploads/backups');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

class DatabaseController {
  /**
   * POST /api/database/backup - Crea nuovo backup
   */
  async createBackup(req: Request, res: Response) {
    try {
      const backup = await databaseService.createBackup();
      res.json({
        success: true,
        backupId: backup.id,
        timestamp: backup.timestamp,
        size: backup.size
      });
    } catch (error) {
      console.error("Errore durante la creazione del backup:", error);
      res.status(500).json({ success: false, message: "Errore durante la creazione del backup" });
    }
  }

  /**
   * GET /api/database/backups - Lista backup disponibili
   */
  getBackups(req: Request, res: Response) {
    try {
      const backups = databaseService.getBackups();
      res.json(backups);
    } catch (error) {
      console.error("Errore durante il recupero dei backup:", error);
      res.status(500).json({ message: "Errore durante il recupero dei backup" });
    }
  }

  /**
   * POST /api/database/restore/:backupId - Ripristina da backup
   */
  async restoreFromBackup(req: Request, res: Response) {
    try {
      const { backupId } = req.params;
      const result = await databaseService.restoreFromBackup(backupId);
      
      if (result) {
        res.json({
          success: true,
          message: `Database ripristinato con successo dal backup ${backupId}`
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Errore durante il ripristino del database"
        });
      }
    } catch (error) {
      console.error("Errore durante il ripristino del database:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il ripristino del database"
      });
    }
  }

  /**
   * POST /api/database/restore - Ripristina da file caricato
   */
  async restoreFromFile(req: Request, res: Response) {
    try {
      const { fileData, fileName } = req.body;

      if (!fileData || !fileName) {
        return res.status(400).json({
          success: false,
          message: "File data and file name are required"
        });
      }

      // Salva il file temporaneamente
      const uploadDir = getBackupUploadDir();
      const tempFilePath = path.join(uploadDir, fileName);
      fs.writeFileSync(tempFilePath, fileData, 'base64');

      const result = await databaseService.restoreFromFile(tempFilePath);

      if (result) {
        res.json({
          success: true,
          message: "Database ripristinato con successo dal file caricato"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Errore durante il ripristino del database"
        });
      }
    } catch (error) {
      console.error("Errore durante il ripristino del database:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il ripristino del database"
      });
    }
  }

  /**
   * DELETE /api/database/backups/:backupId - Elimina backup
   */
  deleteBackup(req: Request, res: Response) {
    try {
      const { backupId } = req.params;
      const result = databaseService.deleteBackup(backupId);

      if (result) {
        res.json({
          success: true,
          message: "Backup eliminato con successo"
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Backup non trovato"
        });
      }
    } catch (error) {
      console.error("Errore durante l'eliminazione del backup:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante l'eliminazione del backup"
      });
    }
  }

  /**
   * GET /api/database/download - Scarica dump del database
   */
  async downloadDump(req: Request, res: Response) {
    try {
      const filePath = await databaseService.generateDump();
      const fileName = path.basename(filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Errore durante il download del dump:", err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: "Errore durante il download del dump del database"
            });
          }
        } else {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error("Errore durante la generazione del dump:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante la generazione del dump del database"
      });
    }
  }

  /**
   * GET /api/database/integrity-check - Verifica integrità database
   */
  async checkIntegrity(req: Request, res: Response) {
    await checkDatabaseIntegrityHandler(req, res);
  }

  /**
   * GET /api/database-snapshot - Genera snapshot database
   */
  async getSnapshot(req: Request, res: Response) {
    try {
      const snapshot = await databaseService.generateSnapshot();
      res.json({
        success: true,
        snapshot
      });
    } catch (error) {
      console.error("Errore durante la generazione dello snapshot:", error);
      res.status(500).json({
        success: false,
        message: 'Errore durante la generazione dello snapshot del database'
      });
    }
  }
}

export const databaseController = new DatabaseController();
