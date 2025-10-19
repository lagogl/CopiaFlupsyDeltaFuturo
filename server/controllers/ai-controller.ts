import type { Express, Request, Response } from "express";
import { AIService, PredictiveGrowthData } from "../ai/ai-service";
import { db } from "../db";
import { baskets, operations, cycles, sgrGiornalieri, sizes, basketLotComposition, lots, flupsys } from "../../shared/schema";
import { eq, desc, and, gte, lte, sql, isNotNull } from "drizzle-orm";

/**
 * Controller per i servizi AI
 * Gestisce le richieste API per i moduli AI integrati
 */
export function registerAIRoutes(app: Express) {
  
  // Health check AI
  app.get("/api/ai/health", async (req: Request, res: Response) => {
    try {
      const health = await AIService.healthCheck();
      res.json({ success: true, ...health });
    } catch (error) {
      console.error('Errore health check AI:', error);
      res.status(500).json({ success: false, error: 'AI service non disponibile' });
    }
  });

  // Modulo 1: Previsioni di crescita avanzate (supporta lotti misti)
  app.post("/api/ai/predictive-growth", async (req: Request, res: Response) => {
    try {
      const { flupsyId, basketIds, basketId, targetSizeId, days = 30 } = req.body;

      console.log('🤖 AI PREDICTIVE REQUEST (v2 - Mixed Lots):', { flupsyId, basketIds, basketId, targetSizeId, days });
      
      // Supporta sia analisi singola che per FLUPSY intera
      if (!flupsyId && !basketId) {
        return res.status(400).json({ success: false, error: 'flupsyId o basketId richiesto' });
      }

      let basketsToAnalyze: any[] = [];
      
      if (flupsyId) {
        // Analisi per FLUPSY intera - recupera cestelli attivi (supporta sia lotti singoli che misti)
        basketsToAnalyze = await db.select({
          basketId: baskets.id,
          physicalNumber: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          state: baskets.state,
          cycleId: cycles.id,
          cycleLotId: cycles.lotId,
          flupsyName: flupsys.name
        })
          .from(baskets)
          .innerJoin(cycles, eq(baskets.id, cycles.basketId))
          .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
          .where(and(
            eq(baskets.flupsyId, flupsyId),
            eq(cycles.state, 'active')
          ));
        console.log(`🔍 Trovati ${basketsToAnalyze.length} cestelli attivi per FLUPSY ${flupsyId}`);
      } else if (basketId) {
        // Analisi per singolo cestello
        basketsToAnalyze = await db.select({
          basketId: baskets.id,
          physicalNumber: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          state: baskets.state,
          cycleId: cycles.id,
          cycleLotId: cycles.lotId,
          flupsyName: flupsys.name
        })
          .from(baskets)
          .innerJoin(cycles, eq(baskets.id, cycles.basketId))
          .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
          .where(eq(baskets.id, basketId));
        console.log(`🔍 Analisi singolo cestello ${basketId}`);
      }

      if (basketsToAnalyze.length === 0) {
        return res.status(404).json({ success: false, error: 'Nessun cestello con lotti attivi trovato' });
      }

      // Analisi AI per cestelli (supporta sia lotti singoli che misti)
      const basketPredictions = [];
      for (const basket of basketsToAnalyze) {
        
        // Recupera composizione lotti: prima prova con basketLotComposition (lotti misti), poi usa il lotId del ciclo (lotto singolo)
        let lotComposition = await db.select({
          lotId: basketLotComposition.lotId,
          animalCount: basketLotComposition.animalCount,
          percentage: basketLotComposition.percentage,
          supplier: lots.supplier,
          supplierLotNumber: lots.supplierLotNumber,
          arrivalDate: lots.arrivalDate,
          totalMortality: lots.totalMortality
        })
          .from(basketLotComposition)
          .innerJoin(lots, eq(basketLotComposition.lotId, lots.id))
          .where(eq(basketLotComposition.basketId, basket.basketId));
        
        // Se non ci sono lotti misti, usa il lotto singolo dal ciclo
        if (lotComposition.length === 0 && basket.cycleLotId) {
          const singleLot = await db.select({
            id: lots.id,
            supplier: lots.supplier,
            supplierLotNumber: lots.supplierLotNumber,
            arrivalDate: lots.arrivalDate,
            totalMortality: lots.totalMortality,
            animalCount: lots.animalCount
          })
            .from(lots)
            .where(eq(lots.id, basket.cycleLotId))
            .limit(1);
          
          if (singleLot.length > 0) {
            lotComposition = [{
              lotId: singleLot[0].id,
              animalCount: singleLot[0].animalCount,
              percentage: 100,
              supplier: singleLot[0].supplier,
              supplierLotNumber: singleLot[0].supplierLotNumber,
              arrivalDate: singleLot[0].arrivalDate,
              totalMortality: singleLot[0].totalMortality
            }];
          }
        }
        
        // Calcola metriche avanzate per lotti misti
        const mixedLotMetrics = {
          isMixed: lotComposition.length > 1,
          dominantLot: lotComposition.reduce((max, lot) => 
            lot.percentage > max.percentage ? lot : max, lotComposition[0]),
          averageMortality: lotComposition.reduce((sum, lot) => 
            sum + ((lot.totalMortality || 0) * (lot.percentage / 100)), 0),
          riskLevel: lotComposition.some(lot => (lot.totalMortality || 0) > 5000) ? 'high' : 'normal'
        };
        
        console.log(`📊 Cestello ${basket.physicalNumber}: ${lotComposition.length} lotti, mortalità media: ${mixedLotMetrics.averageMortality}`);
        
        // Chiamata AI con dati potenziati
        const prediction = await AIService.predictiveGrowth(basket.basketId, targetSizeId, days, {
          mixedLots: true,
          lotComposition: lotComposition,
          mixedMetrics: mixedLotMetrics
        });
        
        basketPredictions.push({
          basketId: basket.basketId,
          basketNumber: basket.physicalNumber,
          lotCount: basket.lotCount,
          totalAnimals: basket.totalAnimals,
          isMixed: mixedLotMetrics.isMixed,
          riskLevel: mixedLotMetrics.riskLevel,
          lotComposition: lotComposition,
          prediction: prediction
        });
      }

      // Calcola summary avanzato per lotti misti
      const mixedBasketsCount = basketPredictions.filter(bp => bp.isMixed).length;
      const highRiskBasketsCount = basketPredictions.filter(bp => bp.riskLevel === 'high').length;
      const totalLots = basketPredictions.reduce((sum, bp) => sum + bp.lotCount, 0);
      const avgAnimalsPerBasket = basketPredictions.reduce((sum, bp) => sum + bp.totalAnimals, 0) / basketPredictions.length;

      // Calcola confidenza media CORRETTA: media di tutti i giorni di tutti i cestelli
      let totalConfidence = 0;
      let totalPredictions = 0;
      basketPredictions.forEach(bp => {
        if (bp.prediction?.predictions) {
          bp.prediction.predictions.forEach(pred => {
            totalConfidence += pred.confidence || 0;
            totalPredictions++;
          });
        }
      });
      const avgConfidence = totalPredictions > 0 ? totalConfidence / totalPredictions : 0;

      res.json({
        success: true,
        prediction: {
          flupsyId,
          basketPredictions,
          mixedLotsAnalysis: {
            mixedBasketsCount,
            pureBasketsCount: basketPredictions.length - mixedBasketsCount,
            highRiskBaskets: highRiskBasketsCount,
            totalLotsInvolved: totalLots,
            averageAnimalsPerBasket: Math.round(avgAnimalsPerBasket)
          },
          summary: {
            totalBaskets: basketsToAnalyze.length,
            analyzedBaskets: basketPredictions.length,
            avgGrowthRate: avgConfidence,
            insights: [
              `Analisi completata per ${basketPredictions.length} cestelli (${mixedBasketsCount} con lotti misti)`,
              `${totalLots} lotti totali coinvolti nell'analisi`,
              highRiskBasketsCount > 0 ? `⚠️ ${highRiskBasketsCount} cestelli ad alto rischio mortalità` : '✅ Tutti i cestelli a rischio normale',
              flupsyId ? `FLUPSY analizzato: ${basketsToAnalyze[0]?.flupsyName || flupsyId}` : 'Analisi singola'
            ],
            recommendations: [
              'Monitoraggio continuo raccomandato, specialmente per lotti misti',
              mixedBasketsCount > 0 ? 'Considera consolidamento lotti per ridurre complessità' : 'Distribuzione lotti ottimale',
              highRiskBasketsCount > 0 ? 'Priorità interventi per cestelli alto rischio' : 'Continua gestione standard',
              'Traccia evoluzione lotti attraverso operazioni di vagliatura'
            ]
          }
        },
        metadata: {
          flupsyId,
          basketIds: basketsToAnalyze.map(b => b.basketId),
          targetSizeId,
          days,
          provider: 'deepseek_ai_v2_mixed_lots',
          analysisVersion: '2.0',
          supportsMixedLots: true
        }
      });

    } catch (error) {
      console.error('Errore previsioni crescita AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 1: Ottimizzazione posizioni cestelli
  app.post("/api/ai/optimize-positions", async (req: Request, res: Response) => {
    try {
      const { flupsyId } = req.body;

      if (!flupsyId) {
        return res.status(400).json({ success: false, error: 'flupsyId richiesto' });
      }

      // Recupera cestelli del FLUPSY con dati recenti
      const flupsyBaskets = await db.select({
        basketId: baskets.id,
        physicalNumber: baskets.physicalNumber,
        row: baskets.row,
        position: baskets.position,
        currentCycleId: baskets.currentCycleId
      })
      .from(baskets)
      .where(eq(baskets.flupsyId, flupsyId));

      // Per ogni cestello, recupera operazione più recente
      const basketsWithData = await Promise.all(
        flupsyBaskets.map(async (basket) => {
          const lastOp = await db.select()
            .from(operations)
            .where(eq(operations.basketId, basket.basketId))
            .orderBy(desc(operations.date))
            .limit(1);

          // Dati ambientali simulati per zona (in futuro da sensori reali)
          const environmentalData = {
            temperature: 18 + Math.random() * 4, // 18-22°C
            ph: 7.8 + Math.random() * 0.4, // 7.8-8.2
            oxygen: 6 + Math.random() * 2, // 6-8 mg/L
            salinity: 32 + Math.random() * 3, // 32-35 ppt
          };

          return {
            basketId: basket.basketId,
            currentPosition: { row: basket.row, position: basket.position },
            growthData: {
              basketId: basket.basketId,
              currentWeight: lastOp[0]?.totalWeight || 0,
              currentAnimalsPerKg: lastOp[0]?.animalsPerKg || 0,
              environmentalData,
              historicalGrowth: []
            }
          };
        })
      );

      // Zone ambientali simulate (in futuro da sensori IoT)
      const environmentalZones = [
        { zone: 'DX-alta', conditions: { flow: 'alto', light: 'medio', temperature: 19.5 } },
        { zone: 'DX-bassa', conditions: { flow: 'medio', light: 'alto', temperature: 20.0 } },
        { zone: 'SX-alta', conditions: { flow: 'medio', light: 'basso', temperature: 19.0 } },
        { zone: 'SX-bassa', conditions: { flow: 'basso', light: 'medio', temperature: 19.8 } }
      ];

      const optimization = await AIService.predictiveGrowth.optimizeBasketPositions({
        flupsyId,
        baskets: basketsWithData,
        environmentalZones
      });

      res.json({
        success: true,
        optimization,
        metadata: {
          flupsyId,
          analyzedBaskets: basketsWithData.length,
          environmentalZones: environmentalZones.length
        }
      });

    } catch (error) {
      console.error('Errore ottimizzazione posizioni AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 3: Rilevamento anomalie (supporta lotti misti)
  app.get("/api/ai/anomaly-detection", async (req: Request, res: Response) => {
    try {
      const { flupsyId, days = 7 } = req.query;

      console.log('🔍 AI ANOMALY DETECTION (v2 - Mixed Lots):', { flupsyId, days });

      // Data limite per operazioni recenti
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - Number(days));
      
      // Query operations con dati composizione lotti
      let operationsQuery = db.select({
        operationId: operations.id,
        date: operations.date,
        type: operations.type,
        basketId: operations.basketId,
        basketPhysical: baskets.physicalNumber,
        cycleId: operations.cycleId,
        animalCount: operations.animalCount,
        totalWeight: operations.totalWeight,
        averageWeight: operations.averageWeight,
        deadCount: operations.deadCount,
        mortalityRate: operations.mortalityRate,
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name,
        // Dati composizione lotto
        lotId: basketLotComposition.lotId,
        lotPercentage: basketLotComposition.percentage,
        lotAnimalCount: basketLotComposition.animalCount,
        supplier: lots.supplier,
        supplierLotNumber: lots.supplierLotNumber,
        lotTotalMortality: lots.totalMortality
      })
      .from(operations)
      .innerJoin(baskets, eq(operations.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .leftJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .leftJoin(lots, eq(basketLotComposition.lotId, lots.id))
      .where(gte(operations.date, dateLimit.toISOString().split('T')[0]));

      if (flupsyId && flupsyId !== 'undefined' && flupsyId !== 'null') {
        operationsQuery = operationsQuery.where(
          and(
            eq(baskets.flupsyId, Number(flupsyId)),
            gte(operations.date, dateLimit.toISOString().split('T')[0])
          )
        );
      }

      const recentOperations = await operationsQuery.limit(200);

      console.log(`🔍 Analizzando ${recentOperations.length} operazioni con composizione lotti`);

      // Raggruppa operazioni per cestello per analisi lotti misti
      const basketOperations = recentOperations.reduce((acc, op) => {
        if (!acc[op.basketId]) {
          acc[op.basketId] = {
            basketId: op.basketId,
            basketPhysical: op.basketPhysical,
            flupsyName: op.flupsyName,
            operations: [],
            lots: new Set(),
            totalMortality: 0,
            averageMortality: 0,
            isMixed: false
          };
        }
        acc[op.basketId].operations.push(op);
        if (op.lotId) acc[op.basketId].lots.add(op.lotId);
        if (op.mortalityRate) acc[op.basketId].totalMortality += op.mortalityRate;
        return acc;
      }, {} as Record<number, any>);

      // Calcola metriche anomalie per lotti misti
      const basketAnalysis = Object.values(basketOperations).map((basket: any) => {
        const mortalityOperations = basket.operations.filter((op: any) => op.mortalityRate > 0);
        basket.averageMortality = mortalityOperations.length > 0 ? 
          basket.totalMortality / mortalityOperations.length : 0;
        basket.isMixed = basket.lots.size > 1;
        
        // Identifica anomalie specifiche lotti misti
        const anomalies = [];
        
        if (basket.averageMortality > 15) {
          anomalies.push({
            type: 'high_mortality',
            severity: 'critical',
            description: `Mortalità critica: ${basket.averageMortality.toFixed(1)}%`,
            mixedLotImpact: basket.isMixed ? 'Possibile incompatibilità tra lotti' : 'Lotto singolo'
          });
        }
        
        if (basket.isMixed && basket.lots.size > 3) {
          anomalies.push({
            type: 'excessive_fragmentation',
            severity: 'medium',
            description: `Eccessiva frammentazione: ${basket.lots.size} lotti diversi`,
            mixedLotImpact: 'Gestione complessa, rischio errori operativi'
          });
        }

        return { ...basket, anomalies };
      });

      // Prepara dati per analisi AI
      const anomaliesData = {
        operations: recentOperations.slice(0, 50),
        basketAnalysis: basketAnalysis.slice(0, 20),
        mixedLotsMetrics: {
          totalBaskets: basketAnalysis.length,
          mixedBaskets: basketAnalysis.filter(b => b.isMixed).length,
          averageLotFragmentation: basketAnalysis.reduce((sum, b) => sum + b.lots.size, 0) / basketAnalysis.length,
          criticalBaskets: basketAnalysis.filter(b => b.anomalies.some((a: any) => a.severity === 'critical')).length
        },
        timeframe: `${days} giorni`,
        flupsyId: flupsyId || 'tutti'
      };

      const anomalyAnalysis = await AIService.detectAnomalies(anomaliesData);

      res.json({
        success: true,
        anomalies: anomalyAnalysis,
        basketAnalysis: basketAnalysis,
        mixedLotsInsights: {
          totalBaskets: basketAnalysis.length,
          mixedBasketsPercentage: Math.round((basketAnalysis.filter(b => b.isMixed).length / basketAnalysis.length) * 100),
          averageLotsPerBasket: anomaliesData.mixedLotsMetrics.averageLotFragmentation.toFixed(1),
          criticalAnomalies: basketAnalysis.filter(b => b.anomalies.some((a: any) => a.severity === 'critical')).length
        },
        metadata: {
          timeframe: `${days} giorni`,
          totalOperations: recentOperations.length,
          flupsyId: flupsyId || 'tutti',
          provider: 'deepseek_ai_v2_mixed_lots',
          analysisVersion: '2.0',
          supportsMixedLots: true
        }
      });

    } catch (error) {
      console.error('❌ Errore rilevamento anomalie AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 3: Analisi business intelligence (supporta lotti misti)
  app.get("/api/ai/business-analytics", async (req: Request, res: Response) => {
    try {
      const { timeframe = '30' } = req.query;
      const days = Number(timeframe);
      
      console.log('💼 AI BUSINESS ANALYTICS (v2 - Mixed Lots):', { days });
      
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // Query operazioni con composizione lotti per business analytics accurate
      const recentOperations = await db.select({
        operationId: operations.id,
        date: operations.date,
        type: operations.type,
        basketId: operations.basketId,
        basketPhysical: baskets.physicalNumber,
        cycleId: operations.cycleId,
        animalCount: operations.animalCount,
        totalWeight: operations.totalWeight,
        averageWeight: operations.averageWeight,
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name,
        // Dati lotti per analisi business
        lotId: basketLotComposition.lotId,
        lotPercentage: basketLotComposition.percentage,
        lotAnimalCount: basketLotComposition.animalCount,
        supplier: lots.supplier,
        supplierLotNumber: lots.supplierLotNumber,
        lotArrivalDate: lots.arrivalDate
      })
      .from(operations)
      .innerJoin(baskets, eq(operations.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .leftJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .leftJoin(lots, eq(basketLotComposition.lotId, lots.id))
      .where(gte(operations.date, dateLimit.toISOString().split('T')[0]))
      .orderBy(desc(operations.date))
      .limit(100);

      const recentCycles = await db.select()
        .from(cycles)
        .where(gte(cycles.startDate, dateLimit.toISOString().split('T')[0]))
        .limit(50);

      console.log(`💼 Analizzando ${recentOperations.length} operazioni con ${recentCycles.length} cicli per business analytics`);

      // Calcola metriche business avanzate per lotti misti
      const businessMetrics = {
        production: {
          totalKgProduced: recentOperations.reduce((sum, op) => sum + ((op.totalWeight || 0) / 1000), 0),
          totalOperations: recentOperations.length,
          uniqueLots: new Set(recentOperations.filter(op => op.lotId).map(op => op.lotId)).size,
          activeCycles: recentCycles.length,
          productionPerCycle: recentCycles.length > 0 ? 
            recentOperations.reduce((sum, op) => sum + ((op.totalWeight || 0) / 1000), 0) / recentCycles.length : 0
        },
        efficiency: {
          avgLotUtilization: 0, // Calcolato di seguito
          mixedLotAdvantage: 0, // Calcolato di seguito
          supplierDiversification: new Set(recentOperations.filter(op => op.supplier).map(op => op.supplier)).size
        },
        financial: {
          estimatedRevenue: 0, // Calcolato di seguito
          revenuePerLot: 0,
          costEfficiency: 0
        }
      };

      // Simula calcoli finanziari basati su performance lotti misti
      const totalProduction = businessMetrics.production.totalKgProduced;
      const avgPricePerKg = 15; // €15/kg stimato
      businessMetrics.financial.estimatedRevenue = totalProduction * avgPricePerKg;
      businessMetrics.financial.revenuePerLot = businessMetrics.production.uniqueLots > 0 ? 
        businessMetrics.financial.estimatedRevenue / businessMetrics.production.uniqueLots : 0;

      // Calcola efficienza lotti misti
      const lotPerformance = recentOperations.reduce((acc, op) => {
        if (!op.lotId) return acc;
        if (!acc[op.lotId]) {
          acc[op.lotId] = { totalWeight: 0, operations: 0, baskets: new Set() };
        }
        acc[op.lotId].totalWeight += (op.totalWeight || 0) / 1000;
        acc[op.lotId].operations += 1;
        acc[op.lotId].baskets.add(op.basketId);
        return acc;
      }, {} as Record<number, any>);

      businessMetrics.efficiency.avgLotUtilization = Object.values(lotPerformance).length > 0 ?
        Object.values(lotPerformance).reduce((sum: number, lot: any) => sum + lot.baskets.size, 0) / Object.values(lotPerformance).length : 0;

      businessMetrics.efficiency.mixedLotAdvantage = businessMetrics.efficiency.avgLotUtilization > 1 ? 
        (businessMetrics.efficiency.avgLotUtilization - 1) * 10 : 0; // % vantaggio

      // Simula dati vendite per lotti misti
      const salesData = recentOperations
        .filter(op => op.type === 'vendita' || op.type === 'raccolta-finale')
        .map(op => ({
          date: op.date.toString(),
          amount: (op.totalWeight || 0) * avgPricePerKg / 1000, // Euro
          quantity: (op.totalWeight || 0) / 1000, // kg
          price: avgPricePerKg,
          lotId: op.lotId,
          supplier: op.supplier
        }));

      const businessData = {
        operations: recentOperations.slice(0, 30),
        cycles: recentCycles.slice(0, 20),
        salesData: salesData,
        mixedLotsMetrics: businessMetrics,
        lotPerformance: Object.entries(lotPerformance).slice(0, 10).map(([lotId, perf]: [string, any]) => ({
          lotId: parseInt(lotId),
          performance: perf,
          revenue: perf.totalWeight * avgPricePerKg,
          efficiency: perf.totalWeight / perf.operations
        }))
      };

      const businessAnalysis = await AIService.businessAnalytics(days, businessData);

      res.json({
        success: true,
        analysis: businessAnalysis,
        businessMetrics: businessMetrics,
        businessInsights: {
          totalRevenueEstimate: Math.round(businessMetrics.financial.estimatedRevenue),
          productionEfficiency: Math.round(businessMetrics.production.productionPerCycle * 100) / 100,
          lotDiversification: businessMetrics.production.uniqueLots,
          mixedLotAdvantage: Math.round(businessMetrics.efficiency.mixedLotAdvantage * 10) / 10,
          supplierReliance: Math.round((1 / businessMetrics.efficiency.supplierDiversification) * 100)
        },
        metadata: {
          timeframe: `${days} giorni`,
          provider: 'deepseek_ai_v2_mixed_lots',
          analysisVersion: '2.0',
          supportsMixedLots: true
        }
      });

    } catch (error) {
      console.error('❌ Errore business analytics AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 8: Analisi sostenibilità (supporta lotti misti)
  app.get("/api/ai/sustainability", async (req: Request, res: Response) => {
    try {
      const { flupsyId, timeframe = '30' } = req.query;
      const days = Number(timeframe);
      
      console.log('🌱 AI SUSTAINABILITY ANALYSIS (v2 - Mixed Lots):', { flupsyId, days });
      
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // Query operations con composizione lotti per calcoli precisi
      let operationsQuery = db.select({
        operationId: operations.id,
        date: operations.date,
        type: operations.type,
        basketId: operations.basketId,
        basketPhysical: baskets.physicalNumber,
        cycleId: operations.cycleId,
        animalCount: operations.animalCount,
        totalWeight: operations.totalWeight,
        averageWeight: operations.averageWeight,
        flupsyId: baskets.flupsyId,
        flupsyName: flupsys.name,
        // Composizione lotti per calcoli sostenibilità accurati
        lotId: basketLotComposition.lotId,
        lotPercentage: basketLotComposition.percentage,
        lotAnimalCount: basketLotComposition.animalCount,
        supplier: lots.supplier,
        supplierLotNumber: lots.supplierLotNumber,
        supplierDistance: sql<number>`CASE 
          WHEN ${lots.supplier} = 'Ecotapes Zeeland' THEN 800
          WHEN ${lots.supplier} = 'Roem' THEN 600 
          WHEN ${lots.supplier} = 'Taylor Shellfish' THEN 8500
          ELSE 1000 END`, // km stimati per carbon footprint
        lotArrivalDate: lots.arrivalDate
      })
      .from(operations)
      .innerJoin(baskets, eq(operations.basketId, baskets.id))
      .innerJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .innerJoin(cycles, eq(operations.cycleId, cycles.id))
      .leftJoin(basketLotComposition, eq(cycles.id, basketLotComposition.cycleId))
      .leftJoin(lots, eq(basketLotComposition.lotId, lots.id))
      .where(gte(operations.date, dateLimit.toISOString().split('T')[0]));

      if (flupsyId && flupsyId !== 'undefined' && flupsyId !== 'null') {
        operationsQuery = operationsQuery.where(
          and(
            eq(baskets.flupsyId, Number(flupsyId)),
            gte(operations.date, dateLimit.toISOString().split('T')[0])
          )
        );
      }

      const sustainabilityOps = await operationsQuery.limit(100);

      console.log(`🌱 Analizzando ${sustainabilityOps.length} operazioni con composizione lotti per sostenibilità`);

      // Calcola metriche sostenibilità avanzate per lotti misti
      const sustainabilityMetrics = {
        production: {
          totalKgProduced: sustainabilityOps.reduce((sum, op) => sum + ((op.totalWeight || 0) / 1000), 0),
          totalOperations: sustainabilityOps.length,
          uniqueBaskets: new Set(sustainabilityOps.map(op => op.basketId)).size,
          uniqueLots: new Set(sustainabilityOps.filter(op => op.lotId).map(op => op.lotId)).size
        },
        transport: {
          avgSupplierDistance: sustainabilityOps.length > 0 ? 
            sustainabilityOps.reduce((sum, op) => sum + (op.supplierDistance || 0), 0) / sustainabilityOps.length : 0,
          carbonFootprintKg: 0, // Calcolato di seguito
          supplierDiversity: new Set(sustainabilityOps.filter(op => op.supplier).map(op => op.supplier)).size
        },
        efficiency: {
          mixedLotComplexity: 0, // Calcolato di seguito
          operationsPerBasket: sustainabilityOps.length > 0 ? 
            sustainabilityOps.length / new Set(sustainabilityOps.map(op => op.basketId)).size : 0,
          avgLotFragmentation: 0 // Calcolato di seguito
        }
      };

      // Calcola carbon footprint basato su distanza fornitori pesata per quantità
      let totalWeightedDistance = 0;
      let totalWeight = 0;
      sustainabilityOps.forEach(op => {
        if (op.totalWeight && op.supplierDistance) {
          totalWeightedDistance += (op.totalWeight / 1000) * op.supplierDistance;
          totalWeight += (op.totalWeight / 1000);
        }
      });
      
      sustainabilityMetrics.transport.carbonFootprintKg = totalWeight > 0 ? 
        (totalWeightedDistance * 0.2) / totalWeight : 0; // 0.2 kg CO2 per km*kg stimato

      // Raggruppa per cestello per calcolare complessità lotti misti
      const basketComplexity = sustainabilityOps.reduce((acc, op) => {
        if (!acc[op.basketId]) {
          acc[op.basketId] = new Set();
        }
        if (op.lotId) acc[op.basketId].add(op.lotId);
        return acc;
      }, {} as Record<number, Set<number>>);

      sustainabilityMetrics.efficiency.mixedLotComplexity = Object.values(basketComplexity).length > 0 ?
        Object.values(basketComplexity).reduce((sum, lotSet) => sum + lotSet.size, 0) / Object.values(basketComplexity).length : 0;

      sustainabilityMetrics.efficiency.avgLotFragmentation = sustainabilityMetrics.efficiency.mixedLotComplexity;

      // Recupera dati ambientali
      const environmentalData = await db.select()
        .from(sgrGiornalieri)
        .where(gte(sgrGiornalieri.recordDate, dateLimit))
        .limit(days);

      const sustainabilityData = {
        operations: sustainabilityOps.slice(0, 20), // Limita per AI
        environmentalData: environmentalData.map(env => ({
          date: env.recordDate?.toISOString(),
          temperature: env.temperature,
          ph: env.pH,
          oxygen: env.oxygen,
          salinity: env.salinity
        })),
        mixedLotsMetrics: sustainabilityMetrics,
        insights: {
          isMixedLotSystem: sustainabilityMetrics.production.uniqueLots > sustainabilityMetrics.production.uniqueBaskets,
          complexityLevel: sustainabilityMetrics.efficiency.avgLotFragmentation > 2 ? 'high' : 
                         sustainabilityMetrics.efficiency.avgLotFragmentation > 1.5 ? 'medium' : 'low',
          supplierConcentration: sustainabilityMetrics.transport.supplierDiversity < 3 ? 'concentrated' : 'diversified',
          carbonEfficiencyClass: sustainabilityMetrics.transport.carbonFootprintKg < 50 ? 'A' :
                                sustainabilityMetrics.transport.carbonFootprintKg < 100 ? 'B' : 
                                sustainabilityMetrics.transport.carbonFootprintKg < 200 ? 'C' : 'D'
        }
      };

      const sustainabilityAnalysis = await AIService.sustainabilityAnalysis(flupsyId ? Number(flupsyId) : undefined, days, sustainabilityData);

      res.json({
        success: true,
        analysis: sustainabilityAnalysis,
        mixedLotsMetrics: sustainabilityMetrics,
        sustainabilityInsights: {
          productionEfficiency: Math.round(sustainabilityMetrics.production.totalKgProduced / sustainabilityMetrics.production.totalOperations * 100) / 100,
          carbonIntensity: Math.round(sustainabilityMetrics.transport.carbonFootprintKg * 100) / 100,
          operationalComplexity: Math.round(sustainabilityMetrics.efficiency.avgLotFragmentation * 10) / 10,
          supplierDiversity: sustainabilityMetrics.transport.supplierDiversity,
          sustainabilityScore: Math.max(0, 100 - (sustainabilityMetrics.transport.carbonFootprintKg / 2) - (sustainabilityMetrics.efficiency.avgLotFragmentation * 5))
        },
        metadata: {
          timeframe: `${days} giorni`,
          flupsyId: flupsyId || 'tutti',
          provider: 'deepseek_ai_v2_mixed_lots',
          analysisVersion: '2.0',
          supportsMixedLots: true
        }
      });

    } catch (error) {
      console.error('Errore analisi sostenibilità AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 8: Verifica compliance
  app.get("/api/ai/compliance", async (req: Request, res: Response) => {
    try {
      const { timeframe = '30' } = req.query;
      const days = Number(timeframe);
      
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // Recupera operazioni recenti per verifica compliance
      const recentOperations = await db.select()
        .from(operations)
        .where(gte(operations.date, dateLimit.toISOString().split('T')[0]))
        .limit(50);

      // Recupera dati ambientali per compliance
      const environmentalReadings = await db.select()
        .from(sgrGiornalieri)
        .where(gte(sgrGiornalieri.recordDate, dateLimit))
        .limit(days);

      // Certificazioni e normative simulate (in futuro da database dedicato)
      const certifications = [
        'Biologico EU',
        'Acquacoltura Sostenibile ASC',
        'Global G.A.P.'
      ];

      const regulations = [
        'Reg. EU 848/2018 (Biologico)',
        'Reg. EU 1379/2013 (Mercato ittico)',
        'D.Lgs 148/2008 (Benessere animale)',
        'Normativa regionale acquacoltura'
      ];

      const complianceData = {
        operations: recentOperations.slice(0, 15),
        environmentalReadings: environmentalReadings.map(reading => ({
          date: reading.recordDate?.toISOString(),
          temperature: reading.temperature,
          ph: reading.pH,
          oxygen: reading.oxygen,
          ammonia: reading.ammonia,
          salinity: reading.salinity
        })),
        certifications,
        regulations
      };

      const complianceAnalysis = await AIService.sustainability.checkCompliance(complianceData);

      res.json({
        success: true,
        compliance: complianceAnalysis,
        metadata: {
          timeframe: `${days} giorni`,
          operationsChecked: recentOperations.length,
          environmentalReadings: environmentalReadings.length,
          certificationsMonitored: certifications.length,
          regulationsChecked: regulations.length
        }
      });

    } catch (error) {
      console.error('Errore verifica compliance AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  console.log('🤖 Route AI registrate con successo');
}