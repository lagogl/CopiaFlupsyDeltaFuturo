import { db } from '../db';
import { eq, and, between, desc } from 'drizzle-orm';
import { 
  impactCategories, 
  impactFactors, 
  operationImpacts,
  flupsyImpacts,
  cycleImpacts,
  sustainabilityGoals,
  sustainabilityReports,
  type ImpactCategory,
  type ImpactFactor,
  type OperationImpact,
  type FlupsyImpact,
  type CycleImpact,
  type SustainabilityGoal,
  type SustainabilityReport,
  type InsertImpactCategory,
  type InsertImpactFactor,
  type InsertOperationImpact,
  type InsertFlupsyImpact,
  type InsertCycleImpact,
  type InsertSustainabilityGoal,
  type InsertSustainabilityReport
} from '../../shared/eco-impact/schema';
import { 
  calculateOperationImpact, 
  calculateSustainabilityScore,
  calculateImpactTrend,
  generateSustainabilitySuggestions
} from '../../shared/eco-impact/utils';
import { operations, baskets } from '../../shared/schema';

/**
 * Servizio per la gestione degli impatti ambientali
 */
export class EcoImpactService {
  
  /**
   * Ottiene tutte le categorie di impatto
   */
  async getImpactCategories(): Promise<ImpactCategory[]> {
    try {
      return await db.select().from(impactCategories).orderBy(impactCategories.importance);
    } catch (error) {
      console.error('Errore nel recupero delle categorie di impatto:', error);
      throw error;
    }
  }
  
  /**
   * Crea una nuova categoria di impatto
   */
  async createImpactCategory(data: InsertImpactCategory): Promise<ImpactCategory> {
    try {
      const [category] = await db.insert(impactCategories).values(data).returning();
      return category;
    } catch (error) {
      console.error('Errore nella creazione della categoria di impatto:', error);
      throw error;
    }
  }
  
  /**
   * Ottiene tutti i fattori di impatto
   */
  async getImpactFactors(): Promise<ImpactFactor[]> {
    try {
      return await db.select().from(impactFactors);
    } catch (error) {
      console.error('Errore nel recupero dei fattori di impatto:', error);
      throw error;
    }
  }
  
  /**
   * Crea un nuovo fattore di impatto
   */
  async createImpactFactor(data: InsertImpactFactor): Promise<ImpactFactor> {
    try {
      const [factor] = await db.insert(impactFactors).values(data).returning();
      return factor;
    } catch (error) {
      console.error('Errore nella creazione del fattore di impatto:', error);
      throw error;
    }
  }
  
  /**
   * Calcola e salva l'impatto ambientale di un'operazione
   */
  async calculateAndSaveOperationImpact(operationId: number): Promise<OperationImpact[]> {
    try {
      // Recupera i dettagli dell'operazione
      const [operation] = await db.select().from(operations).where(eq(operations.id, operationId));
      
      if (!operation) {
        throw new Error(`Operazione con ID ${operationId} non trovata`);
      }
      
      // Recupera le categorie di impatto e i fattori
      const categories = await this.getImpactCategories();
      const factors = await this.getImpactFactors();
      
      // Parametri per il calcolo dell'impatto (usa valori standardizzati)
      const parameters = {
        basketCount: 1, // Impatto base per cestello
        duration: 30, // Durata standard in minuti
        // Altri parametri specifici dell'operazione...
      };
      
      // Calcola gli impatti per questa operazione
      const calculatedImpacts = calculateOperationImpact(operation.type, parameters);
      
      // Prepara gli oggetti per il salvataggio nel database
      const impactsToSave: InsertOperationImpact[] = [];
      
      // Per ogni categoria calcolata, trova il fattore appropriato e salva l'impatto
      for (const categoryCode in calculatedImpacts) {
        const category = categories.find(c => c.code === categoryCode);
        if (!category) continue;
        
        const factor = factors.find(f => 
          f.categoryId === category.id && 
          f.applicableToOperation
        );
        if (!factor) continue;
        
        impactsToSave.push({
          operationId,
          categoryId: category.id,
          impactValue: calculatedImpacts[categoryCode],
          baselineValue: factor.value, // Usa il valore del fattore come baseline
          improvementPercentage: 0, // Nessun miglioramento di default
          metadata: { 
            calculated: true,
            parameters,
            factorId: factor.id // Salva l'ID del fattore nei metadata
          }
        });
      }
      
      // Salva tutti gli impatti calcolati
      if (impactsToSave.length > 0) {
        return await db.insert(operationImpacts).values(impactsToSave).returning();
      }
      
      return [];
    } catch (error) {
      console.error('Errore nel calcolo dell\'impatto dell\'operazione:', error);
      throw error;
    }
  }
  
  /**
   * Recupera gli impatti ambientali per un'operazione
   */
  async getOperationImpacts(operationId: number): Promise<OperationImpact[]> {
    try {
      return await db.select()
        .from(operationImpacts)
        .where(eq(operationImpacts.operationId, operationId));
    } catch (error) {
      console.error('Errore nel recupero degli impatti dell\'operazione:', error);
      throw error;
    }
  }
  
  /**
   * Calcola il punteggio di sostenibilità per una FLUPSY in un periodo
   */
  async calculateFlupsySustainabilityScore(
    flupsyId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    score: number,
    impacts: Record<string, number>,
    trends: Record<string, number>,
    suggestions: string[]
  }> {
    try {
      // Recupera gli impatti delle operazioni associate a questa FLUPSY nel periodo attraverso il cestello
      const operationsList = await db.select({
        operation: operations
      })
        .from(operations)
        .innerJoin(baskets, eq(operations.basketId, baskets.id))
        .where(
          and(
            eq(baskets.flupsyId, flupsyId),
            between(
              operations.date,
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            )
          )
        );
      
      // Mappa per accumulare gli impatti totali
      const totalImpacts: Record<string, number> = {
        water: 0,
        carbon: 0,
        energy: 0,
        waste: 0,
        biodiversity: 0
      };
      
      // Recupera e accumula gli impatti di tutte le operazioni
      for (const { operation } of operationsList) {
        const operationImpactsList = await db.select()
          .from(operationImpacts)
          .where(eq(operationImpacts.operationId, operation.id));
        
        // Aggiungi ciascun impatto alla categoria appropriata
        for (const impact of operationImpactsList) {
          // Recupera la categoria corrispondente
          const [category] = await db.select()
            .from(impactCategories)
            .where(eq(impactCategories.id, impact.categoryId));
          
          if (category && category.code in totalImpacts) {
            totalImpacts[category.code] += impact.impactValue || 0;
          }
        }
      }
      
      // Calcola il punteggio di sostenibilità
      const score = calculateSustainabilityScore(totalImpacts);
      
      // Recupera gli impatti del periodo precedente per calcolare i trend
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(endDate);
      const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      previousStartDate.setDate(previousStartDate.getDate() - periodDays);
      previousEndDate.setDate(previousEndDate.getDate() - periodDays);
      
      // Implementazione statica senza ricorsione per il calcolo del periodo precedente
      const previousOperationsList = await db.select({
        operation: operations
      })
        .from(operations)
        .innerJoin(baskets, eq(operations.basketId, baskets.id))
        .where(
          and(
            eq(baskets.flupsyId, flupsyId),
            between(
              operations.date,
              previousStartDate.toISOString().split('T')[0],
              previousEndDate.toISOString().split('T')[0]
            )
          )
        );
      
      // Mappa per accumulare gli impatti totali del periodo precedente
      const previousTotalImpacts: Record<string, number> = {
        water: 0,
        carbon: 0,
        energy: 0,
        waste: 0,
        biodiversity: 0
      };
      
      // Se non ci sono operazioni nel periodo precedente, usiamo valori predefiniti
      const previousResult = { 
        score: 0, 
        impacts: previousTotalImpacts,
        trends: { water: 0, carbon: 0, energy: 0, waste: 0, biodiversity: 0 },
        suggestions: []
      };
      
      // Calcola i trend
      const trends = calculateImpactTrend(totalImpacts, previousResult.impacts);
      
      // Genera suggerimenti
      const suggestions = generateSustainabilitySuggestions(totalImpacts);
      
      return {
        score,
        impacts: totalImpacts,
        trends,
        suggestions
      };
    } catch (error) {
      console.error('Errore nel calcolo del punteggio di sostenibilità:', error);
      throw error;
    }
  }
  
  /**
   * Crea un nuovo obiettivo di sostenibilità
   */
  async createSustainabilityGoal(data: InsertSustainabilityGoal): Promise<SustainabilityGoal> {
    try {
      const [goal] = await db.insert(sustainabilityGoals).values(data).returning();
      return goal;
    } catch (error) {
      console.error('Errore nella creazione dell\'obiettivo di sostenibilità:', error);
      throw error;
    }
  }
  
  /**
   * Recupera tutti gli obiettivi di sostenibilità
   */
  async getSustainabilityGoals(flupsyId?: number): Promise<SustainabilityGoal[]> {
    try {
      if (flupsyId) {
        return await db.select()
          .from(sustainabilityGoals)
          .where(eq(sustainabilityGoals.flupsyId, flupsyId));
      } else {
        return await db.select().from(sustainabilityGoals);
      }
    } catch (error) {
      console.error('Errore nel recupero degli obiettivi di sostenibilità:', error);
      throw error;
    }
  }
  
  /**
   * Crea un nuovo report di sostenibilità
   */
  async createSustainabilityReport(data: InsertSustainabilityReport): Promise<SustainabilityReport> {
    try {
      const [report] = await db.insert(sustainabilityReports).values(data).returning();
      return report;
    } catch (error) {
      console.error('Errore nella creazione del report di sostenibilità:', error);
      throw error;
    }
  }
  
  /**
   * Recupera i report di sostenibilità
   */
  async getSustainabilityReports(): Promise<SustainabilityReport[]> {
    try {
      return await db.select()
        .from(sustainabilityReports)
        .orderBy(desc(sustainabilityReports.createdAt));
    } catch (error) {
      console.error('Errore nel recupero dei report di sostenibilità:', error);
      throw error;
    }
  }
}