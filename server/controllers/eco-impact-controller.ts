import { Request, Response } from 'express';
import { EcoImpactService } from '../services/eco-impact-service';
import { 
  insertImpactCategorySchema,
  insertImpactFactorSchema,
  insertSustainabilityGoalSchema,
  insertSustainabilityReportSchema,
  insertOperationImpactDefaultSchema,
  operationImpactDefaults
} from '../../shared/eco-impact/schema';
import { eq, and, sql } from 'drizzle-orm';
import { flupsys } from '../../shared/schema';
import { z } from 'zod';
import { db } from '../db';

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
        flupsyId: z.string()
      });
      
      // Schema per i query params
      const querySchema = z.object({
        startDate: z.string().refine(val => !isNaN(new Date(val).getTime()), {
          message: "Data di inizio non valida"
        }),
        endDate: z.string().refine(val => !isNaN(new Date(val).getTime()), {
          message: "Data di fine non valida"
        })
      });
      
      // Valida i parametri e query
      const paramsResult = paramsSchema.safeParse(req.params);
      const queryResult = querySchema.safeParse(req.query);
      
      if (!paramsResult.success || !queryResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Parametri non validi',
          details: !paramsResult.success ? paramsResult.error.format() : queryResult.error?.format()
        });
      }
      
      const { flupsyId } = paramsResult.data;
      // Converti le date da stringhe a oggetti Date
      const startDateObj = new Date(queryResult.data.startDate);
      const endDateObj = new Date(queryResult.data.endDate);
      
      // Verifico se è richiesto il calcolo per tutti i FLUPSY
      if (flupsyId === 'all') {
        // Ottiene tutti i FLUPSY
        const allFlupsys = await db.select().from(flupsys);
        
        // Calcola il punteggio medio di sostenibilità combinando i risultati di tutti i FLUPSY
        const allResults = await Promise.all(
          allFlupsys.map(flupsy => 
            ecoImpactService.calculateFlupsySustainabilityScore(
              flupsy.id,
              startDateObj,
              endDateObj
            ).catch(err => {
              console.error(`Errore nel calcolo per FLUPSY ${flupsy.id}:`, err);
              return null;
            })
          )
        );
        
        // Filtra i risultati nulli da eventuali errori
        const validResults = allResults.filter(result => result !== null);
        
        if (validResults.length === 0) {
          return res.status(500).json({
            success: false,
            error: 'Errore nel calcolo del punteggio di sostenibilità per tutti i FLUPSY'
          });
        }
        
        // Calcola la media dei punteggi
        const avgScore = validResults.reduce((sum, result) => sum + (result?.score || 0), 0) / validResults.length;
        
        // Combina gli impatti di tutte le categorie
        const combinedImpacts = {
          water: 0,
          carbon: 0,
          energy: 0,
          waste: 0,
          biodiversity: 0
        };
        
        // Combina i trend
        const combinedTrends = {
          water: 0,
          carbon: 0,
          energy: 0,
          waste: 0,
          biodiversity: 0
        };
        
        // Accumula tutti gli impatti e i trend
        validResults.forEach(result => {
          if (result && result.impacts) {
            Object.keys(combinedImpacts).forEach(key => {
              combinedImpacts[key as keyof typeof combinedImpacts] += (result.impacts[key as keyof typeof result.impacts] || 0);
            });
          }
          
          if (result && result.trends) {
            Object.keys(combinedTrends).forEach(key => {
              combinedTrends[key as keyof typeof combinedTrends] += (result.trends[key as keyof typeof result.trends] || 0);
            });
          }
        });
        
        // Calcola la media dei trend
        Object.keys(combinedTrends).forEach(key => {
          combinedTrends[key as keyof typeof combinedTrends] /= validResults.length;
        });
        
        // Raccogli tutti i suggerimenti unici
        const allSuggestions = new Set<string>();
        validResults.forEach(result => {
          if (result && result.suggestions) {
            result.suggestions.forEach(suggestion => allSuggestions.add(suggestion));
          }
        });
        
        return res.status(200).json({
          success: true,
          score: avgScore,
          impacts: combinedImpacts,
          trends: combinedTrends,
          suggestions: Array.from(allSuggestions)
        });
      } else {
        // Caso singolo FLUPSY - converti l'ID in numero
        const flupsyIdNum = parseInt(flupsyId);
        
        if (isNaN(flupsyIdNum)) {
          return res.status(400).json({
            success: false,
            error: 'ID FLUPSY non valido'
          });
        }
        
        // Calcola il punteggio di sostenibilità per il singolo FLUPSY
        const result = await ecoImpactService.calculateFlupsySustainabilityScore(
          flupsyIdNum,
          startDateObj,
          endDateObj
        );
        
        return res.status(200).json({
          success: true,
          ...result
        });
      }
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
      
      // Recupera gli obiettivi
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
      // Parametro opzionale flupsyId
      const flupsyId = req.query.flupsyId ? parseInt(req.query.flupsyId as string) : undefined;
      
      // Recupera i report
      const reports = await ecoImpactService.getSustainabilityReports(flupsyId);
      
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

  /**
   * Recupera i valori di impatto predefiniti per le operazioni
   */
  async getOperationImpactDefaults(req: Request, res: Response) {
    try {
      const defaults = await db.select().from(operationImpactDefaults);
      
      // Trasforma i risultati per gestire correttamente i valori personalizzati
      const transformedDefaults = defaults.map(defaultItem => {
        // Per i valori personalizzati, restituiamo un displayName
        if (defaultItem.operationType === 'custom' && defaultItem.customName) {
          return {
            ...defaultItem,
            displayName: defaultItem.customName
          };
        } else {
          return {
            ...defaultItem,
            displayName: defaultItem.operationType
          };
        }
      });
      
      return res.status(200).json({
        success: true,
        defaults: transformedDefaults
      });
    } catch (error) {
      console.error('Errore nel recupero dei valori di impatto predefiniti:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nel recupero dei valori di impatto predefiniti'
      });
    }
  }
  
  /**
   * Elimina un valore di impatto predefinito
   */
  async deleteOperationImpactDefault(req: Request, res: Response) {
    try {
      // Valida i parametri
      const { id } = req.params;
      const defaultId = parseInt(id);
      
      if (isNaN(defaultId)) {
        return res.status(400).json({
          success: false,
          error: 'ID non valido'
        });
      }
      
      // Elimina il valore predefinito
      const deleted = await db.delete(operationImpactDefaults)
        .where(eq(operationImpactDefaults.id, defaultId))
        .returning();
      
      if (deleted.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Valore predefinito non trovato'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Valore predefinito eliminato con successo',
        deleted: deleted[0]
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione del valore di impatto predefinito:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nell\'eliminazione del valore di impatto predefinito'
      });
    }
  }
  
  /**
   * Crea o aggiorna un valore di impatto predefinito per un tipo di operazione
   */
  async createOrUpdateOperationImpactDefault(req: Request, res: Response) {
    try {
      // Valida i dati in ingresso
      const { operationType, water, carbon, energy, waste, biodiversity, customName } = req.body;
      
      // Validazione manuale
      if (!operationType || 
          typeof water !== 'number' || 
          typeof carbon !== 'number' || 
          typeof energy !== 'number' || 
          typeof waste !== 'number' || 
          typeof biodiversity !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Dati non validi',
          details: 'Tutti i campi sono obbligatori e i valori di impatto devono essere numeri'
        });
      }
      
      // Se operationType non è un valore enum, usiamo 'custom' e salviamo il nome personalizzato
      let actualOperationType = operationType;
      let actualCustomName = customName;
      
      // Controllo se operationType non è uno dei valori predefiniti dell'enum
      const validOperationTypes = [
        'prima-attivazione', 'pulizia', 'vagliatura', 'trattamento', 'misura', 
        'vendita', 'selezione-vendita', 'cessazione', 'peso', 'selezione-origine',
        'trasporto-corto', 'trasporto-medio', 'trasporto-lungo', 'custom'
      ];
      
      if (!validOperationTypes.includes(operationType)) {
        // Se non è un valore valido, è un nome personalizzato
        actualOperationType = 'custom';
        actualCustomName = operationType;
      }
      
      // Verifica se esiste già un record per questo tipo di operazione
      const existingDefault = await db.select()
        .from(operationImpactDefaults)
        .where(
          actualOperationType === 'custom' 
            ? and(
                eq(operationImpactDefaults.operationType, 'custom'),
                eq(operationImpactDefaults.customName, actualCustomName || '')
              )
            : eq(operationImpactDefaults.operationType, actualOperationType)
        )
        .limit(1);
      
      let result;
      
      if (existingDefault.length > 0) {
        // Aggiorna il record esistente
        result = await db.update(operationImpactDefaults)
          .set({ 
            water,
            carbon,
            energy,
            waste,
            biodiversity,
            updatedAt: new Date()
          })
          .where(
            actualOperationType === 'custom' 
              ? and(
                  eq(operationImpactDefaults.operationType, 'custom'),
                  eq(operationImpactDefaults.customName, actualCustomName || '')
                )
              : eq(operationImpactDefaults.operationType, actualOperationType)
          )
          .returning();
      } else {
        // Crea un nuovo record
        result = await db.insert(operationImpactDefaults)
          .values({
            operationType: actualOperationType,
            customName: actualCustomName,
            water,
            carbon,
            energy,
            waste,
            biodiversity
          })
          .returning();
      }
      
      return res.status(201).json({
        success: true,
        default: result[0]
      });
    } catch (error) {
      console.error('Errore nella creazione/aggiornamento del valore di impatto predefinito:', error);
      return res.status(500).json({
        success: false,
        error: 'Errore nella creazione/aggiornamento del valore di impatto predefinito'
      });
    }
  }
}