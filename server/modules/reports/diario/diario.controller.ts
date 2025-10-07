import { Request, Response } from 'express';
import { diarioService } from './diario.service';

class DiarioController {
  /**
   * GET /api/diario/giacenza - Giacenza giornaliera
   */
  async getGiacenza(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      const result = await diarioService.getGiacenza(date);
      return res.json(result);
    } catch (error) {
      console.error('Errore nell\'API giacenza:', error);
      return res.status(500).json({ error: 'Errore nel calcolo della giacenza' });
    }
  }

  /**
   * GET /api/diario/operations-by-date - Operazioni per data
   */
  async getOperationsByDate(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      const operations = await diarioService.getOperationsByDate(date);
      return res.json(operations);
    } catch (error) {
      console.error('Errore nell\'API operazioni per data:', error);
      return res.status(500).json({ error: 'Errore nel recupero delle operazioni per data' });
    }
  }

  /**
   * GET /api/diario/size-stats - Statistiche per taglia
   */
  async getSizeStats(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      const stats = await diarioService.getSizeStats(date);
      return res.json(stats);
    } catch (error) {
      console.error('Errore nell\'API statistiche per taglia:', error);
      return res.status(500).json({ error: 'Errore nel recupero delle statistiche per taglia' });
    }
  }

  /**
   * GET /api/diario/daily-totals - Totali giornalieri
   */
  async getDailyTotals(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Formato data non valido. Utilizzare YYYY-MM-DD' });
      }
      
      const totals = await diarioService.getDailyTotals(date);
      return res.json(totals);
    } catch (error) {
      console.error('Errore nell\'API totali giornalieri:', error);
      return res.status(500).json({ error: 'Errore nel recupero dei totali giornalieri' });
    }
  }

  /**
   * GET /api/diario/month-data-old - Dati mensili completi (vecchio endpoint)
   */
  async getMonthDataOld(req: Request, res: Response) {
    try {
      const { month } = req.query;

      if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: "Formato mese non valido. Utilizzare il formato YYYY-MM" });
      }

      const monthData = await diarioService.getMonthData(month);
      return res.json(monthData);
    } catch (error) {
      console.error("Errore nel recupero dei dati mensili:", error);
      return res.status(500).json({ error: "Errore nel recupero dei dati mensili" });
    }
  }

  /**
   * GET /api/diario/month-data - Dati mensili (disabled)
   */
  getMonthData(req: Request, res: Response) {
    res.status(501).json({ error: "Diario controller temporarily disabled" });
  }

  /**
   * GET /api/diario/calendar-csv - Export CSV calendario (disabled)
   */
  getCalendarCsv(req: Request, res: Response) {
    res.status(501).json({ error: "Diario calendar CSV export temporarily disabled" });
  }
}

export const diarioController = new DiarioController();
