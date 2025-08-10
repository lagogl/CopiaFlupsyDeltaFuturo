import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface PredictiveGrowthData {
  basketId: number;
  currentWeight: number;
  currentAnimalsPerKg: number;
  environmentalData: {
    temperature: number;
    ph: number;
    oxygen: number;
    salinity: number;
  };
  historicalGrowth: Array<{
    date: string;
    weight: number;
    animalsPerKg: number;
  }>;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'growth' | 'mortality' | 'environmental' | 'operational';
  description: string;
  recommendation: string;
  confidence: number;
}

export interface SustainabilityAnalysis {
  carbonFootprint: number;
  waterUsageEfficiency: number;
  energyEfficiency: number;
  wasteReduction: number;
  overallScore: number;
  recommendations: string[];
  certificationReadiness: {
    organic: boolean;
    sustainable: boolean;
    lowImpact: boolean;
  };
}

/**
 * Modulo 1: AI Predittivo Avanzato per crescita intelligente
 */
export class PredictiveGrowthAI {
  
  /**
   * Calcola previsioni di crescita avanzate usando AI
   */
  static async analyzePredictiveGrowth(data: PredictiveGrowthData): Promise<{
    predictedGrowthRate: number;
    optimalHarvestDate: string;
    targetSizeDate: string;
    growthFactors: Array<{ factor: string; impact: number; recommendation: string }>;
    confidence: number;
  }> {
    try {
      const prompt = `
        Analizza i seguenti dati di crescita di molluschi in acquacoltura e fornisci previsioni avanzate:
        
        Dati Cestello ID: ${data.basketId}
        Peso attuale: ${data.currentWeight}g
        Animali per kg: ${data.currentAnimalsPerKg}
        
        Condizioni ambientali:
        - Temperatura: ${data.environmentalData.temperature}°C
        - pH: ${data.environmentalData.ph}
        - Ossigeno: ${data.environmentalData.oxygen}mg/L
        - Salinità: ${data.environmentalData.salinity}ppt
        
        Storico crescita: ${JSON.stringify(data.historicalGrowth)}
        
        Fornisci una risposta JSON con:
        {
          "predictedGrowthRate": numero (percentuale giornaliera di crescita prevista),
          "optimalHarvestDate": "YYYY-MM-DD" (data ottimale per raccolta),
          "targetSizeDate": "YYYY-MM-DD" (data raggiungimento taglia commerciale),
          "growthFactors": [
            {"factor": "nome fattore", "impact": numero da -1 a 1, "recommendation": "raccomandazione"}
          ],
          "confidence": numero da 0 a 1 (livello di confidenza della previsione)
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un esperto AI in acquacoltura specializzato nell'analisi predittiva della crescita di molluschi. Fornisci analisi precise basate su dati scientifici."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Errore in analyzePredictiveGrowth:', error);
      throw error;
    }
  }

  /**
   * Ottimizza posizionamento cestelli nel FLUPSY
   */
  static async optimizeBasketPositions(flupsyData: {
    flupsyId: number;
    baskets: Array<{
      basketId: number;
      currentPosition: { row: string; position: number };
      growthData: PredictiveGrowthData;
    }>;
    environmentalZones: Array<{
      zone: string;
      conditions: any;
    }>;
  }): Promise<{
    recommendations: Array<{
      basketId: number;
      currentPosition: { row: string; position: number };
      recommendedPosition: { row: string; position: number };
      reason: string;
      expectedImprovement: number;
    }>;
    overallEfficiencyGain: number;
  }> {
    try {
      const prompt = `
        Analizza il posizionamento ottimale dei cestelli nel FLUPSY considerando:
        
        FLUPSY ID: ${flupsyData.flupsyId}
        Cestelli: ${JSON.stringify(flupsyData.baskets.map(b => ({
          id: b.basketId,
          position: b.currentPosition,
          weight: b.growthData.currentWeight,
          animalsPerKg: b.growthData.currentAnimalsPerKg
        })))}
        
        Zone ambientali: ${JSON.stringify(flupsyData.environmentalZones)}
        
        Fornisci raccomandazioni di riposizionamento per ottimizzare la crescita in formato JSON:
        {
          "recommendations": [
            {
              "basketId": numero,
              "currentPosition": {"row": "DX/SX", "position": numero},
              "recommendedPosition": {"row": "DX/SX", "position": numero},
              "reason": "motivo del cambio",
              "expectedImprovement": numero percentuale miglioramento previsto
            }
          ],
          "overallEfficiencyGain": numero percentuale guadagno complessivo
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un esperto in ottimizzazione di layout per acquacoltura. Analizza posizionamenti per massimizzare la crescita."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Errore in optimizeBasketPositions:', error);
      throw error;
    }
  }
}

/**
 * Modulo 3: AI Analytics e Business Intelligence
 */
export class AnalyticsAI {

  /**
   * Rileva anomalie nei dati operativi
   */
  static async detectAnomalies(data: {
    baskets: Array<{
      id: number;
      recentOperations: Array<{
        date: string;
        type: string;
        animalCount: number;
        totalWeight: number;
        mortalityRate: number;
      }>;
      environmentalData: any;
    }>;
  }): Promise<AnomalyDetectionResult[]> {
    try {
      const prompt = `
        Analizza i seguenti dati operativi per rilevare anomalie in acquacoltura:
        
        ${JSON.stringify(data, null, 2)}
        
        Identifica anomalie considerando:
        - Tassi di mortalità inusuali
        - Variazioni anomale di peso
        - Condizioni ambientali problematiche
        - Pattern operativi irregolari
        
        Fornisci risultati in formato JSON:
        {
          "anomalies": [
            {
              "isAnomaly": boolean,
              "severity": "low|medium|high|critical",
              "type": "growth|mortality|environmental|operational",
              "description": "descrizione dettagliata",
              "recommendation": "azione raccomandata",
              "confidence": numero da 0 a 1,
              "affectedBaskets": [numeri ID cestelli]
            }
          ]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un AI specializzato nel rilevamento di anomalie in acquacoltura. Identifica problemi e fornisci soluzioni pratiche."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.anomalies || [];
    } catch (error) {
      console.error('Errore in detectAnomalies:', error);
      return [];
    }
  }

  /**
   * Analizza pattern per Business Intelligence
   */
  static async analyzeBusinessPatterns(data: {
    operations: Array<any>;
    cycles: Array<any>;
    sales: Array<any>;
    timeframe: string;
  }): Promise<{
    productivityTrends: Array<{ period: string; trend: string; value: number }>;
    profitabilityAnalysis: { currentMargin: number; projectedMargin: number; recommendations: string[] };
    operationalEfficiency: { score: number; bottlenecks: string[]; improvements: string[] };
    marketInsights: { bestSellingPeriods: string[]; priceOptimization: any; demandForecasting: any };
  }> {
    try {
      const prompt = `
        Analizza i seguenti dati business per insight di acquacoltura:
        
        Operazioni: ${JSON.stringify(data.operations.slice(0, 50))} // Limitiamo per non eccedere token
        Cicli: ${JSON.stringify(data.cycles.slice(0, 20))}
        Vendite: ${JSON.stringify(data.sales.slice(0, 30))}
        Periodo: ${data.timeframe}
        
        Fornisci analisi business completa in JSON:
        {
          "productivityTrends": [{"period": "periodo", "trend": "crescente/stabile/decrescente", "value": numero}],
          "profitabilityAnalysis": {
            "currentMargin": numero percentuale,
            "projectedMargin": numero percentuale,
            "recommendations": ["raccomandazione1", "raccomandazione2"]
          },
          "operationalEfficiency": {
            "score": numero da 0 a 100,
            "bottlenecks": ["problema1", "problema2"],
            "improvements": ["miglioramento1", "miglioramento2"]
          },
          "marketInsights": {
            "bestSellingPeriods": ["periodo1", "periodo2"],
            "priceOptimization": {"currentPrice": numero, "suggestedPrice": numero, "reasoning": "motivo"},
            "demandForecasting": {"nextMonth": numero, "nextQuarter": numero, "confidence": numero}
          }
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un consulente AI specializzato in business intelligence per acquacoltura. Fornisci analisi strategiche e raccomandazioni operative."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Errore in analyzeBusinessPatterns:', error);
      throw error;
    }
  }
}

/**
 * Modulo 8: AI per Sostenibilità e Compliance
 */
export class SustainabilityAI {

  /**
   * Calcola impatto ambientale e sostenibilità
   */
  static async analyzeSustainability(data: {
    operations: Array<any>;
    environmentalData: Array<any>;
    energyUsage: { daily: number; monthly: number };
    waterUsage: { daily: number; monthly: number };
    wasteProduction: { organic: number; plastic: number; chemical: number };
    production: { totalKg: number; cycles: number };
  }): Promise<SustainabilityAnalysis> {
    try {
      const prompt = `
        Analizza la sostenibilità dell'operazione di acquacoltura:
        
        Dati operativi: ${JSON.stringify(data.operations.slice(0, 20))}
        Dati ambientali: ${JSON.stringify(data.environmentalData.slice(0, 10))}
        Consumo energetico: ${JSON.stringify(data.energyUsage)}
        Consumo idrico: ${JSON.stringify(data.waterUsage)}
        Produzione rifiuti: ${JSON.stringify(data.wasteProduction)}
        Produzione: ${JSON.stringify(data.production)}
        
        Calcola metriche di sostenibilità e fornisci risultato JSON:
        {
          "carbonFootprint": numero kg CO2 equivalente,
          "waterUsageEfficiency": numero da 0 a 100,
          "energyEfficiency": numero da 0 a 100,
          "wasteReduction": numero da 0 a 100,
          "overallScore": numero da 0 a 100,
          "recommendations": ["raccomandazione1", "raccomandazione2"],
          "certificationReadiness": {
            "organic": boolean,
            "sustainable": boolean,
            "lowImpact": boolean
          },
          "improvements": {
            "carbonReduction": {"potential": numero, "actions": ["azione1"]},
            "waterOptimization": {"potential": numero, "actions": ["azione1"]},
            "energySaving": {"potential": numero, "actions": ["azione1"]}
          }
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un consulente AI specializzato in sostenibilità ambientale per acquacoltura. Calcola impatti e suggerisci miglioramenti basati su standard internazionali."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Errore in analyzeSustainability:', error);
      throw error;
    }
  }

  /**
   * Monitoraggio compliance normative
   */
  static async checkCompliance(data: {
    operations: Array<any>;
    environmentalReadings: Array<any>;
    certifications: string[];
    regulations: string[];
  }): Promise<{
    complianceScore: number;
    violations: Array<{ regulation: string; severity: string; description: string; remedy: string }>;
    certificationStatus: Array<{ name: string; status: string; expiry: string; requirements: string[] }>;
    recommendations: string[];
  }> {
    try {
      const prompt = `
        Verifica compliance normativa per acquacoltura:
        
        Operazioni: ${JSON.stringify(data.operations.slice(0, 15))}
        Rilevamenti ambientali: ${JSON.stringify(data.environmentalReadings.slice(0, 10))}
        Certificazioni attive: ${JSON.stringify(data.certifications)}
        Normative applicabili: ${JSON.stringify(data.regulations)}
        
        Verifica compliance e fornisci report JSON:
        {
          "complianceScore": numero da 0 a 100,
          "violations": [
            {
              "regulation": "nome normativa",
              "severity": "low|medium|high|critical",
              "description": "descrizione violazione",
              "remedy": "azione correttiva"
            }
          ],
          "certificationStatus": [
            {
              "name": "nome certificazione",
              "status": "valid|expiring|expired|not_applicable",
              "expiry": "YYYY-MM-DD o N/A",
              "requirements": ["requisito1", "requisito2"]
            }
          ],
          "recommendations": ["raccomandazione1", "raccomandazione2"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un esperto AI in compliance normativa per acquacoltura. Conosci le normative EU, nazionali e internazionali del settore."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Errore in checkCompliance:', error);
      throw error;
    }
  }
}

/**
 * Servizio principale AI che coordina tutti i moduli
 */
export class AIService {
  static predictiveGrowth = PredictiveGrowthAI;
  static analytics = AnalyticsAI;
  static sustainability = SustainabilityAI;

  /**
   * Health check per verificare che OpenAI sia configurato correttamente
   */
  static async healthCheck(): Promise<{ status: string; model: string }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test connection" }],
        max_tokens: 10
      });
      
      return {
        status: 'connected',
        model: 'gpt-4o'
      };
    } catch (error) {
      console.error('AI Health Check fallito:', error);
      return {
        status: 'error',
        model: 'none'
      };
    }
  }
}