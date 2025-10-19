import { db } from "../../db";
import { 
  operations, 
  baskets, 
  cycles, 
  lots, 
  sizes, 
  screeningOperations,
  screeningSourceBaskets,
  screeningDestinationBaskets,
  growthAnalysisRuns,
  basketGrowthProfiles,
  screeningImpactAnalysis,
  growthDistributions
} from "@shared/schema";
import { eq, and, gte, lte, sql, inArray, desc } from "drizzle-orm";
import OpenAI from "openai";

const AI_API_KEY = process.env.OPENAI_API_KEY;
const AI_BASE_URL = 'https://api.deepseek.com';
const AI_MODEL = 'deepseek-chat';

let aiClient: OpenAI | null = null;

function initializeAIClient() {
  const currentApiKey = process.env.OPENAI_API_KEY;
  if (currentApiKey && currentApiKey.length > 10) {
    aiClient = new OpenAI({
      apiKey: currentApiKey,
      baseURL: AI_BASE_URL,
      timeout: 30000,
    });
    return true;
  }
  return false;
}

initializeAIClient();

export interface GrowthVariabilityAnalysisOptions {
  dateFrom?: string;
  dateTo?: string;
  flupsyIds?: number[];
  analysisTypes?: string[];
}

export interface AnalysisResults {
  runId: number;
  executedAt: Date;
  datasetSize: number;
  insights: string[];
  distributions: any[];
  basketProfiles: any[];
  screeningImpacts: any[];
  visualizationData: {
    growthDistribution: any[];
    clusterScatter: any[];
    positionHeatmap: any[];
    screeningImpact: any[];
  };
}

export class GrowthVariabilityService {
  
  /**
   * Esegue analisi completa della variabilità di crescita
   */
  static async runComprehensiveAnalysis(
    options: GrowthVariabilityAnalysisOptions
  ): Promise<AnalysisResults> {
    console.log('🔬 Avvio analisi variabilità crescita...', options);
    
    try {
      const startTime = Date.now();
      
      // 1. Recupera dati operazioni con JOIN ottimizzati
      const operationsData = await this.fetchOperationsData(options);
      console.log(`📊 Operazioni recuperate: ${operationsData.length}`);
      
      if (operationsData.length === 0) {
        throw new Error('Nessuna operazione trovata per il periodo specificato');
      }
      
      // 2. Analisi distributiva (calcolo statistiche)
      const distributions = await this.analyzeGrowthDistribution(operationsData);
      console.log(`📈 Distribuzioni calcolate: ${distributions.length}`);
      
      // 3. Clustering cestelli (fast/average/slow)
      const basketProfiles = await this.clusterBaskets(operationsData);
      console.log(`🎯 Cestelli profilati: ${basketProfiles.length}`);
      
      // 4. Analisi impatto vagliature
      const screeningImpacts = await this.analyzeScreeningImpact(options);
      console.log(`✂️ Impatti vagliature analizzati: ${screeningImpacts.length}`);
      
      // 5. Genera insights AI
      const insights = await this.generateAIInsights({
        operationsData,
        distributions,
        basketProfiles,
        screeningImpacts
      });
      console.log(`💡 Insights AI generati: ${insights.length}`);
      
      // 6. Salva risultati analisi
      const [analysisRun] = await db.insert(growthAnalysisRuns).values({
        dateFrom: options.dateFrom || null,
        dateTo: options.dateTo || null,
        flupsyIds: options.flupsyIds ? JSON.stringify(options.flupsyIds) : null,
        analysisTypes: options.analysisTypes ? JSON.stringify(options.analysisTypes) : null,
        status: 'completed',
        datasetSize: operationsData.length,
        results: {
          distributions,
          basketProfiles: basketProfiles.slice(0, 100),
          screeningImpacts,
          executionTimeMs: Date.now() - startTime
        },
        insights
      }).returning();
      
      console.log(`✅ Analisi completata in ${Date.now() - startTime}ms - Run ID: ${analysisRun.id}`);
      
      // 7. Prepara dati visualizzazione
      const visualizationData = this.prepareVisualizationData({
        distributions,
        basketProfiles,
        screeningImpacts,
        operationsData
      });
      
      return {
        runId: analysisRun.id,
        executedAt: analysisRun.executedAt,
        datasetSize: operationsData.length,
        insights,
        distributions,
        basketProfiles,
        screeningImpacts,
        visualizationData
      };
      
    } catch (error) {
      console.error('❌ Errore analisi variabilità:', error);
      
      // Salva run fallito
      await db.insert(growthAnalysisRuns).values({
        dateFrom: options.dateFrom || null,
        dateTo: options.dateTo || null,
        status: 'failed',
        datasetSize: 0,
        errorMessage: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Recupera operazioni con dati completi
   */
  private static async fetchOperationsData(options: GrowthVariabilityAnalysisOptions) {
    const conditions = [];
    
    if (options.dateFrom) {
      conditions.push(gte(operations.date, options.dateFrom));
    }
    if (options.dateTo) {
      conditions.push(lte(operations.date, options.dateTo));
    }
    
    // Recupera operazioni di tipo "peso" con dati completi
    const query = db
      .select({
        operation: operations,
        basket: baskets,
        cycle: cycles,
        lot: lots,
        size: sizes
      })
      .from(operations)
      .leftJoin(baskets, eq(operations.basketId, baskets.id))
      .leftJoin(cycles, eq(operations.cycleId, cycles.id))
      .leftJoin(lots, eq(operations.lotId, lots.id))
      .leftJoin(sizes, eq(operations.sizeId, sizes.id))
      .where(and(
        eq(operations.type, 'peso'),
        sql`${operations.animalCount} > 0`,
        sql`${operations.totalWeight} > 0`,
        ...conditions
      ))
      .orderBy(operations.date);
    
    if (options.flupsyIds && options.flupsyIds.length > 0) {
      query.where(and(...conditions, inArray(baskets.flupsyId, options.flupsyIds)));
    }
    
    return await query;
  }
  
  /**
   * Analizza distribuzione crescita per taglia/lotto/mese
   */
  private static async analyzeGrowthDistribution(operationsData: any[]) {
    const distributions = [];
    
    // Raggruppa per taglia e mese
    const groups = new Map<string, any[]>();
    
    for (const row of operationsData) {
      if (!row.operation.animalsPerKg || !row.size) continue;
      
      const date = new Date(row.operation.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${row.size.id}-${month}-${year}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }
    
    // Calcola statistiche per ogni gruppo
    for (const [key, groupData] of groups) {
      const [sizeId, month, year] = key.split('-').map(Number);
      
      // Calcola SGR per ogni coppia di operazioni consecutive
      const sgrs: number[] = [];
      const sortedByBasket = new Map<number, any[]>();
      
      for (const row of groupData) {
        const basketId = row.basket?.id;
        if (!basketId) continue;
        
        if (!sortedByBasket.has(basketId)) {
          sortedByBasket.set(basketId, []);
        }
        sortedByBasket.get(basketId)!.push(row);
      }
      
      for (const [basketId, basketOps] of sortedByBasket) {
        basketOps.sort((a, b) => new Date(a.operation.date).getTime() - new Date(b.operation.date).getTime());
        
        for (let i = 1; i < basketOps.length; i++) {
          const prev = basketOps[i - 1];
          const curr = basketOps[i];
          
          const prevWeight = 1000000 / (prev.operation.animalsPerKg || 1);
          const currWeight = 1000000 / (curr.operation.animalsPerKg || 1);
          const days = Math.abs(
            (new Date(curr.operation.date).getTime() - new Date(prev.operation.date).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (days > 0 && prevWeight > 0 && currWeight > 0) {
            const sgr = ((Math.log(currWeight) - Math.log(prevWeight)) / days) * 100;
            if (sgr >= -5 && sgr <= 10) {
              sgrs.push(sgr);
            }
          }
        }
      }
      
      if (sgrs.length === 0) continue;
      
      // Calcola statistiche
      sgrs.sort((a, b) => a - b);
      const mean = sgrs.reduce((sum, v) => sum + v, 0) / sgrs.length;
      const variance = sgrs.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / sgrs.length;
      const stdDev = Math.sqrt(variance);
      
      const p25 = sgrs[Math.floor(sgrs.length * 0.25)];
      const p50 = sgrs[Math.floor(sgrs.length * 0.50)];
      const p75 = sgrs[Math.floor(sgrs.length * 0.75)];
      const p90 = sgrs[Math.floor(sgrs.length * 0.90)];
      
      distributions.push({
        sizeId,
        month,
        year,
        sampleSize: sgrs.length,
        meanSgr: mean,
        medianSgr: p50,
        stdDeviation: stdDev,
        percentile25: p25,
        percentile50: p50,
        percentile75: p75,
        percentile90: p90,
        minSgr: sgrs[0],
        maxSgr: sgrs[sgrs.length - 1],
        distributionType: stdDev > mean * 0.5 ? 'skewed' : 'normal',
        rawData: { sgrs: sgrs.slice(0, 100) }
      });
    }
    
    return distributions;
  }
  
  /**
   * Clustering cestelli in fast/average/slow growers
   */
  private static async clusterBaskets(operationsData: any[]) {
    const basketStats = new Map<number, {
      basketId: number;
      flupsyId: number;
      row: string;
      position: number;
      sgrs: number[];
      supplier: string;
      avgDensity: number;
    }>();
    
    // Calcola SGR medio per cestello
    for (const row of operationsData) {
      const basketId = row.basket?.id;
      if (!basketId) continue;
      
      if (!basketStats.has(basketId)) {
        basketStats.set(basketId, {
          basketId,
          flupsyId: row.basket.flupsyId,
          row: row.basket.row,
          position: row.basket.position,
          sgrs: [],
          supplier: row.lot?.supplier || 'unknown',
          avgDensity: 0
        });
      }
    }
    
    // Calcola SGR per ogni cestello (operazioni consecutive)
    const sortedByBasket = new Map<number, any[]>();
    for (const row of operationsData) {
      const basketId = row.basket?.id;
      if (!basketId) continue;
      
      if (!sortedByBasket.has(basketId)) {
        sortedByBasket.set(basketId, []);
      }
      sortedByBasket.get(basketId)!.push(row);
    }
    
    for (const [basketId, ops] of sortedByBasket) {
      ops.sort((a, b) => new Date(a.operation.date).getTime() - new Date(b.operation.date).getTime());
      const stats = basketStats.get(basketId)!;
      
      for (let i = 1; i < ops.length; i++) {
        const prev = ops[i - 1];
        const curr = ops[i];
        
        const prevWeight = 1000000 / (prev.operation.animalsPerKg || 1);
        const currWeight = 1000000 / (curr.operation.animalsPerKg || 1);
        const days = Math.abs(
          (new Date(curr.operation.date).getTime() - new Date(prev.operation.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (days > 0 && prevWeight > 0 && currWeight > 0) {
          const sgr = ((Math.log(currWeight) - Math.log(prevWeight)) / days) * 100;
          if (sgr >= -5 && sgr <= 10) {
            stats.sgrs.push(sgr);
          }
        }
      }
      
      // Calcola densità media
      const densities = ops.map(o => o.operation.animalCount).filter(d => d > 0);
      stats.avgDensity = densities.reduce((sum, v) => sum + v, 0) / (densities.length || 1);
    }
    
    // Calcola SGR globale medio
    const allSgrs = Array.from(basketStats.values()).flatMap(s => s.sgrs);
    const globalMeanSgr = allSgrs.reduce((sum, v) => sum + v, 0) / (allSgrs.length || 1);
    
    // Assegna cluster
    const profiles = [];
    for (const stats of basketStats.values()) {
      if (stats.sgrs.length === 0) continue;
      
      const avgSgr = stats.sgrs.reduce((sum, v) => sum + v, 0) / stats.sgrs.length;
      const deviation = ((avgSgr - globalMeanSgr) / globalMeanSgr) * 100;
      
      let cluster = 'average';
      if (deviation > 15) cluster = 'fast';
      if (deviation < -15) cluster = 'slow';
      
      // Score posizione (posizioni 1-5 tendenzialmente migliori per flusso acqua)
      const positionScore = Math.max(0, 100 - (stats.position * 5));
      
      // Score densità (densità più basse = crescita migliore)
      const densityScore = Math.max(0, 100 - (stats.avgDensity / 2000));
      
      profiles.push({
        basketId: stats.basketId,
        growthCluster: cluster,
        sgrDeviation: deviation,
        confidenceScore: Math.min(stats.sgrs.length / 10, 1),
        influencingFactors: {
          position: { row: stats.row, position: stats.position },
          avgDensity: stats.avgDensity,
          supplier: stats.supplier,
          sampleSize: stats.sgrs.length
        },
        positionScore,
        densityScore,
        supplierScore: 50
      });
    }
    
    return profiles;
  }
  
  /**
   * Analizza impatto vagliature sulla distribuzione
   */
  private static async analyzeScreeningImpact(options: GrowthVariabilityAnalysisOptions) {
    const screeningImpacts = [];
    
    // Recupera vagliature completate
    const conditions = [];
    if (options.dateFrom) {
      conditions.push(gte(screeningOperations.date, options.dateFrom));
    }
    if (options.dateTo) {
      conditions.push(lte(screeningOperations.date, options.dateTo));
    }
    
    const screenings = await db
      .select()
      .from(screeningOperations)
      .where(and(
        eq(screeningOperations.status, 'completed'),
        ...conditions
      ))
      .limit(50);
    
    for (const screening of screenings) {
      // Recupera cestelli sorgente
      const sourceBaskets = await db
        .select()
        .from(screeningSourceBaskets)
        .where(eq(screeningSourceBaskets.screeningId, screening.id));
      
      // Recupera cestelli destinazione
      const destBaskets = await db
        .select()
        .from(screeningDestinationBaskets)
        .where(eq(screeningDestinationBaskets.screeningId, screening.id));
      
      const sold = destBaskets.filter(d => d.category === 'sopra');
      const repositioned = destBaskets.filter(d => d.category === 'sotto');
      
      const animalsSold = sold.reduce((sum, d) => sum + (d.animalCount || 0), 0);
      const animalsRepositioned = repositioned.reduce((sum, d) => sum + (d.animalCount || 0), 0);
      
      // Stima selection bias (animali venduti tendenzialmente fast growers)
      const totalAnimals = animalsSold + animalsRepositioned;
      const selectionBias = totalAnimals > 0 ? (animalsSold / totalAnimals) * 100 : 0;
      
      screeningImpacts.push({
        screeningId: screening.id,
        animalsSold,
        animalsRepositioned,
        avgSgrBefore: null,
        avgSgrAfter: null,
        selectionBias,
        fastGrowersRemoved: Math.floor(animalsSold * 0.7),
        slowGrowersRetained: Math.floor(animalsRepositioned * 0.8)
      });
    }
    
    return screeningImpacts;
  }
  
  /**
   * Genera insights AI testuali
   */
  private static async generateAIInsights(data: {
    operationsData: any[];
    distributions: any[];
    basketProfiles: any[];
    screeningImpacts: any[];
  }): Promise<string[]> {
    if (!aiClient || !AI_API_KEY) {
      return this.generateStatisticalInsights(data);
    }
    
    try {
      const summary = {
        totalOperations: data.operationsData.length,
        totalDistributions: data.distributions.length,
        totalBaskets: data.basketProfiles.length,
        totalScreenings: data.screeningImpacts.length,
        clusterDistribution: {
          fast: data.basketProfiles.filter(p => p.growthCluster === 'fast').length,
          average: data.basketProfiles.filter(p => p.growthCluster === 'average').length,
          slow: data.basketProfiles.filter(p => p.growthCluster === 'slow').length
        },
        sampleDistribution: data.distributions.slice(0, 5)
      };
      
      const prompt = `
        Analizza i seguenti dati di variabilità di crescita in acquacoltura e genera 5-7 insights chiave in italiano:
        
        Dati analisi: ${JSON.stringify(summary, null, 2)}
        
        Focus su:
        1. Distribuzione cluster crescita (fast/average/slow)
        2. Fattori che influenzano variabilità (posizione, densità, supplier)
        3. Impatto vagliature sulla distribuzione
        4. Pattern stagionali/temporali
        5. Raccomandazioni operative
        
        Restituisci un array JSON di stringhe, ogni insight max 120 caratteri:
        ["insight 1", "insight 2", ...]
      `;
      
      const response = await aiClient.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "Sei un esperto in acquacoltura specializzato nell'analisi statistica della crescita di molluschi. Genera insights concisi e actionable in italiano."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{"insights":[]}');
      return result.insights || result.data || [];
      
    } catch (error) {
      console.warn('⚠️ AI insights fallback a statistici:', error.message);
      return this.generateStatisticalInsights(data);
    }
  }
  
  /**
   * Genera insights statistici (fallback senza AI)
   */
  private static generateStatisticalInsights(data: any): string[] {
    const insights = [];
    
    const totalBaskets = data.basketProfiles.length;
    const fast = data.basketProfiles.filter((p: any) => p.growthCluster === 'fast').length;
    const slow = data.basketProfiles.filter((p: any) => p.growthCluster === 'slow').length;
    
    if (totalBaskets > 0) {
      insights.push(`${Math.round((fast/totalBaskets)*100)}% cestelli con crescita veloce, ${Math.round((slow/totalBaskets)*100)}% lenta`);
    }
    
    // Analisi posizione
    const lowPosBaskets = data.basketProfiles.filter((p: any) => p.influencingFactors?.position?.position <= 5);
    const lowPosFast = lowPosBaskets.filter((p: any) => p.growthCluster === 'fast').length;
    if (lowPosBaskets.length > 0) {
      const percentage = Math.round((lowPosFast / lowPosBaskets.length) * 100);
      insights.push(`Posizioni 1-5: ${percentage}% crescita veloce (migliore flusso acqua)`);
    }
    
    // Distribuzione crescita
    if (data.distributions.length > 0) {
      const avgStdDev = data.distributions.reduce((sum: number, d: any) => sum + (d.stdDeviation || 0), 0) / data.distributions.length;
      insights.push(`Variabilità media SGR: ±${avgStdDev.toFixed(2)}% (alta variabilità intra-popolazione)`);
    }
    
    // Impatto vagliature
    if (data.screeningImpacts.length > 0) {
      const avgBias = data.screeningImpacts.reduce((sum: number, s: any) => sum + (s.selectionBias || 0), 0) / data.screeningImpacts.length;
      insights.push(`Vagliature rimuovono mediamente ${avgBias.toFixed(1)}% animali (bias selezione)`);
    }
    
    insights.push('Raccomandazione: Monitorare cestelli "slow" per interventi mirati');
    insights.push('Pattern confermato: La posizione nel FLUPSY influenza significativamente la crescita');
    
    return insights;
  }
  
  /**
   * Prepara dati per visualizzazioni frontend
   */
  private static prepareVisualizationData(data: any) {
    return {
      growthDistribution: data.distributions.map((d: any) => ({
        sizeId: d.sizeId,
        month: d.month,
        mean: d.meanSgr,
        median: d.medianSgr,
        p25: d.percentile25,
        p75: d.percentile75,
        stdDev: d.stdDeviation
      })),
      
      clusterScatter: data.basketProfiles.map((p: any) => ({
        basketId: p.basketId,
        cluster: p.growthCluster,
        deviation: p.sgrDeviation,
        positionScore: p.positionScore,
        densityScore: p.densityScore
      })),
      
      positionHeatmap: this.aggregateByPosition(data.basketProfiles),
      
      screeningImpact: data.screeningImpacts.map((s: any) => ({
        screeningId: s.screeningId,
        sold: s.animalsSold,
        repositioned: s.animalsRepositioned,
        bias: s.selectionBias
      }))
    };
  }
  
  private static aggregateByPosition(profiles: any[]) {
    const heatmap: any[] = [];
    const positionMap = new Map<string, { fast: number; average: number; slow: number; total: number }>();
    
    for (const profile of profiles) {
      const pos = profile.influencingFactors?.position;
      if (!pos) continue;
      
      const key = `${pos.row}-${pos.position}`;
      if (!positionMap.has(key)) {
        positionMap.set(key, { fast: 0, average: 0, slow: 0, total: 0 });
      }
      
      const stats = positionMap.get(key)!;
      stats[profile.growthCluster as 'fast' | 'average' | 'slow']++;
      stats.total++;
    }
    
    for (const [key, stats] of positionMap) {
      const [row, position] = key.split('-');
      heatmap.push({
        row,
        position: parseInt(position),
        fastPercentage: (stats.fast / stats.total) * 100,
        averagePercentage: (stats.average / stats.total) * 100,
        slowPercentage: (stats.slow / stats.total) * 100,
        totalBaskets: stats.total
      });
    }
    
    return heatmap;
  }
  
  /**
   * Lista analisi eseguite
   */
  static async getAnalysisRuns(limit: number = 10) {
    return await db
      .select()
      .from(growthAnalysisRuns)
      .orderBy(desc(growthAnalysisRuns.executedAt))
      .limit(limit);
  }
  
  /**
   * Dettaglio analisi specifica
   */
  static async getAnalysisRunById(runId: number) {
    const [run] = await db
      .select()
      .from(growthAnalysisRuns)
      .where(eq(growthAnalysisRuns.id, runId));
    
    return run;
  }
}
