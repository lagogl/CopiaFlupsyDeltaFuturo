import { Request, Response } from 'express';
import { EcoImpactService } from '../services/eco-impact-service';
import { 
  insertImpactCategorySchema,
  insertImpactFactorSchema,
  insertSustainabilityGoalSchema,
  insertSustainabilityReportSchema
} from '../../shared/eco-impact/schema';
import { z } from 'zod';

// Servizio per l'impatto ambientale
const ecoImpactService = new EcoImpactService();

/**
 * Controller per la gestione degli impatti ambientali
 */
export class EcoImpactController {
  
  /**
   * Ottiene tutte le categorie di impatto ambientale
   */
  async getImpactCategories(req: Request, res: Response) {
    try {
      const categories = await ecoImpactService.getImpactCategories();
      return res.status(200).json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Errore nel recupero delle categorie di impatto:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero delle categorie di impatto'
      });
    }
  }
  
  /**
   * Crea una nuova categoria di impatto ambientale
   */
  async createImpactCategory(req: Request, res: Response) {
    try {
      // Valida i dati in ingresso
      const validationResult = insertImpactCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: validationResult.error.format()
        });
      }
      
      // Crea la nuova categoria
      const category = await ecoImpactService.createImpactCategory(validationResult.data);
      
      return res.status(201).json({
        success: true,
        category
      });
    } catch (error) {
      console.error('Errore nella creazione della categoria di impatto:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella creazione della categoria di impatto'
      });
    }
  }
  
  /**
   * Ottiene tutti i fattori di impatto ambientale
   */
  async getImpactFactors(req: Request, res: Response) {
    try {
      const factors = await ecoImpactService.getImpactFactors();
      return res.status(200).json({
        success: true,
        factors
      });
    } catch (error) {
      console.error('Errore nel recupero dei fattori di impatto:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei fattori di impatto'
      });
    }
  }
  
  /**
   * Crea un nuovo fattore di impatto ambientale
   */
  async createImpactFactor(req: Request, res: Response) {
    try {
      // Valida i dati in ingresso
      const validationResult = insertImpactFactorSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: validationResult.error.format()
        });
      }
      
      // Crea il nuovo fattore
      const factor = await ecoImpactService.createImpactFactor(validationResult.data);
      
      return res.status(201).json({
        success: true,
        factor
      });
    } catch (error) {
      console.error('Errore nella creazione del fattore di impatto:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella creazione del fattore di impatto'
      });
    }
  }
  
  /**
   * Calcola e restituisce l'impatto ambientale di un'operazione
   */
  async calculateOperationImpact(req: Request, res: Response) {
    try {
      // Schema di validazione per i parametri
      const paramsSchema = z.object({
        operationId: z.string().transform(val => parseInt(val))
      });
      
      // Valida i parametri
      const validationResult = paramsSchema.safeParse(req.params);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Parametri non validi',
          details: validationResult.error.format()
        });
      }
      
      const { operationId } = validationResult.data;
      
      // Calcola l'impatto dell'operazione
      const impacts = await ecoImpactService.calculateAndSaveOperationImpact(operationId);
      
      return res.status(200).json({
        success: true,
        impacts
      });
    } catch (error) {
      console.error('Errore nel calcolo dell\'impatto dell\'operazione:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel calcolo dell\'impatto dell\'operazione'
      });
    }
  }
  
  /**
   * Recupera gli impatti ambientali di un'operazione
   */
  async getOperationImpacts(req: Request, res: Response) {
    try {
      // Schema di validazione per i parametri
      const paramsSchema = z.object({
        operationId: z.string().transform(val => parseInt(val))
      });
      
      // Valida i parametri
      const validationResult = paramsSchema.safeParse(req.params);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Parametri non validi',
          details: validationResult.error.format()
        });
      }
      
      const { operationId } = validationResult.data;
      
      // Recupera gli impatti dell'operazione
      const impacts = await ecoImpactService.getOperationImpacts(operationId);
      
      return res.status(200).json({
        success: true,
        impacts
      });
    } catch (error) {
      console.error('Errore nel recupero degli impatti dell\'operazione:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero degli impatti dell\'operazione'
      });
    }
  }
  
  /**
   * Calcola e restituisce il punteggio di sostenibilità per una FLUPSY
   */
  async calculateFlupsySustainability(req: Request, res: Response) {
    try {
      // Schema di validazione per i parametri
      const paramsSchema = z.object({
        flupsyId: z.string().transform(val => parseInt(val))
      });
      
      // Schema per i query params
      const querySchema = z.object({
        startDate: z.string().transform(val => new Date(val)),
        endDate: z.string().transform(val => new Date(val))
      });
      
      // Valida i parametri e query
      const paramsResult = paramsSchema.safeParse(req.params);
      const queryResult = querySchema.safeParse(req.query);
      
      if (!paramsResult.success || !queryResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Parametri non validi',
          details: !paramsResult.success ? paramsResult.error.format() : queryResult.error.format()
        });
      }
      
      const { flupsyId } = paramsResult.data;
      const { startDate, endDate } = queryResult.data;
      
      // Calcola il punteggio di sostenibilità
      const result = await ecoImpactService.calculateFlupsySustainabilityScore(
        flupsyId,
        startDate,
        endDate
      );
      
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Errore nel calcolo del punteggio di sostenibilità:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel calcolo del punteggio di sostenibilità'
      });
    }
  }
  
  /**
   * Crea un nuovo obiettivo di sostenibilità
   */
  async createSustainabilityGoal(req: Request, res: Response) {
    try {
      // Valida i dati in ingresso
      const validationResult = insertSustainabilityGoalSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: validationResult.error.format()
        });
      }
      
      // Crea il nuovo obiettivo
      const goal = await ecoImpactService.createSustainabilityGoal(validationResult.data);
      
      return res.status(201).json({
        success: true,
        goal
      });
    } catch (error) {
      console.error('Errore nella creazione dell\'obiettivo di sostenibilità:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella creazione dell\'obiettivo di sostenibilità'
      });
    }
  }
  
  /**
   * Recupera gli obiettivi di sostenibilità
   */
  async getSustainabilityGoals(req: Request, res: Response) {
    try {
      // Parametro opzionale flupsyId
      const flupsyId = req.query.flupsyId ? parseInt(req.query.flupsyId as string) : undefined;
      
      const goals = await ecoImpactService.getSustainabilityGoals(flupsyId);
      
      return res.status(200).json({
        success: true,
        goals
      });
    } catch (error) {
      console.error('Errore nel recupero degli obiettivi di sostenibilità:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero degli obiettivi di sostenibilità'
      });
    }
  }
  
  /**
   * Crea un nuovo report di sostenibilità
   */
  async createSustainabilityReport(req: Request, res: Response) {
    try {
      // Valida i dati in ingresso
      const validationResult = insertSustainabilityReportSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: validationResult.error.format()
        });
      }
      
      // Crea il nuovo report
      const report = await ecoImpactService.createSustainabilityReport(validationResult.data);
      
      return res.status(201).json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Errore nella creazione del report di sostenibilità:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella creazione del report di sostenibilità'
      });
    }
  }
  
  /**
   * Recupera i report di sostenibilità
   */
  async getSustainabilityReports(req: Request, res: Response) {
    try {
      const reports = await ecoImpactService.getSustainabilityReports();
      
      return res.status(200).json({
        success: true,
        reports
      });
    } catch (error) {
      console.error('Errore nel recupero dei report di sostenibilità:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei report di sostenibilità'
      });
    }
  }
}