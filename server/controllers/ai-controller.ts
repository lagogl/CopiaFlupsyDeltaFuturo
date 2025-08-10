import type { Express, Request, Response } from "express";
import { AIService, PredictiveGrowthData } from "../ai/ai-service";
import { db } from "../db";
import { baskets, operations, cycles, sgrGiornalieri, sizes } from "../../shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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

  // Modulo 1: Previsioni di crescita avanzate
  app.post("/api/ai/predictive-growth", async (req: Request, res: Response) => {
    try {
      const { basketId, targetSizeId, days = 30 } = req.body;

      if (!basketId) {
        return res.status(400).json({ success: false, error: 'basketId richiesto' });
      }

      // Recupera dati del cestello
      const basketData = await db.select()
        .from(baskets)
        .where(eq(baskets.id, basketId))
        .limit(1);

      if (basketData.length === 0) {
        return res.status(404).json({ success: false, error: 'Cestello non trovato' });
      }

      // Recupera operazioni recenti per lo storico
      const recentOperations = await db.select()
        .from(operations)
        .where(eq(operations.basketId, basketId))
        .orderBy(desc(operations.date))
        .limit(10);

      // Recupera dati ambientali recenti
      const environmentalData = await db.select()
        .from(sgrGiornalieri)
        .orderBy(desc(sgrGiornalieri.recordDate))
        .limit(7); // Ultima settimana

      // Prepara dati per AI
      const avgEnvironmental = environmentalData.reduce((acc, curr) => ({
        temperature: acc.temperature + (curr.temperature || 0),
        ph: acc.ph + (curr.pH || 0),
        oxygen: acc.oxygen + (curr.oxygen || 0),
        salinity: acc.salinity + (curr.salinity || 0),
      }), { temperature: 0, ph: 0, oxygen: 0, salinity: 0 });

      const envCount = environmentalData.length || 1;
      const environment = {
        temperature: avgEnvironmental.temperature / envCount,
        ph: avgEnvironmental.ph / envCount,
        oxygen: avgEnvironmental.oxygen / envCount,
        salinity: avgEnvironmental.salinity / envCount,
      };

      const lastOperation = recentOperations[0];
      const growthData: PredictiveGrowthData = {
        basketId,
        currentWeight: lastOperation?.totalWeight || 0,
        currentAnimalsPerKg: lastOperation?.animalsPerKg || 0,
        environmentalData: environment,
        historicalGrowth: recentOperations.map(op => ({
          date: op.date.toString(),
          weight: op.totalWeight || 0,
          animalsPerKg: op.animalsPerKg || 0,
        }))
      };

      // Chiamata AI
      const prediction = await AIService.predictiveGrowth.analyzePredictiveGrowth(growthData);

      res.json({
        success: true,
        prediction,
        metadata: {
          basketId,
          currentData: {
            weight: lastOperation?.totalWeight,
            animalsPerKg: lastOperation?.animalsPerKg,
            lastUpdate: lastOperation?.date
          },
          environmentalConditions: environment
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

  // Modulo 3: Rilevamento anomalie
  app.get("/api/ai/anomaly-detection", async (req: Request, res: Response) => {
    try {
      const { flupsyId, days = 7 } = req.query;

      // Data limite per operazioni recenti
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - Number(days));

      // Query cestelli con operazioni recenti
      let basketQuery = db.select({
        basketId: baskets.id,
        physicalNumber: baskets.physicalNumber,
        flupsyId: baskets.flupsyId
      }).from(baskets);

      if (flupsyId) {
        basketQuery = basketQuery.where(eq(baskets.flupsyId, Number(flupsyId)));
      }

      const basketList = await basketQuery.limit(20); // Limite per performance

      // Per ogni cestello, recupera operazioni recenti
      const basketsWithOperations = await Promise.all(
        basketList.map(async (basket) => {
          const recentOps = await db.select()
            .from(operations)
            .where(and(
              eq(operations.basketId, basket.basketId),
              gte(operations.date, dateLimit.toISOString().split('T')[0])
            ))
            .orderBy(desc(operations.date));

          // Dati ambientali simulati
          const environmentalData = {
            temperature: 19.5,
            ph: 8.0,
            oxygen: 7.2,
            salinity: 33.5
          };

          return {
            id: basket.basketId,
            recentOperations: recentOps.map(op => ({
              date: op.date.toString(),
              type: op.type,
              animalCount: op.animalCount || 0,
              totalWeight: op.totalWeight || 0,
              mortalityRate: op.mortalityRate || 0
            })),
            environmentalData
          };
        })
      );

      const anomalies = await AIService.analytics.detectAnomalies({
        baskets: basketsWithOperations
      });

      res.json({
        success: true,
        anomalies,
        metadata: {
          analyzedBaskets: basketsWithOperations.length,
          timeframe: `${days} giorni`,
          flupsyId: flupsyId || 'tutti'
        }
      });

    } catch (error) {
      console.error('Errore rilevamento anomalie AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 3: Analisi business intelligence
  app.get("/api/ai/business-analytics", async (req: Request, res: Response) => {
    try {
      const { timeframe = '30' } = req.query;
      const days = Number(timeframe);
      
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // Recupera dati per analisi
      const recentOperations = await db.select()
        .from(operations)
        .where(gte(operations.date, dateLimit.toISOString().split('T')[0]))
        .orderBy(desc(operations.date))
        .limit(100);

      const recentCycles = await db.select()
        .from(cycles)
        .where(gte(cycles.startDate, dateLimit.toISOString().split('T')[0]))
        .limit(50);

      // Simula dati vendite (in futuro da modulo vendite reale)
      const salesData = recentOperations
        .filter(op => op.type === 'vendita')
        .map(op => ({
          date: op.date.toString(),
          amount: (op.totalWeight || 0) * 12, // Prezzo simulato €12/kg
          quantity: op.totalWeight || 0,
          price: 12
        }));

      const businessAnalysis = await AIService.analytics.analyzeBusinessPatterns({
        operations: recentOperations,
        cycles: recentCycles,
        sales: salesData,
        timeframe: `${days} giorni`
      });

      res.json({
        success: true,
        analysis: businessAnalysis,
        metadata: {
          timeframe: `${days} giorni`,
          operationsAnalyzed: recentOperations.length,
          cyclesAnalyzed: recentCycles.length,
          salesAnalyzed: salesData.length
        }
      });

    } catch (error) {
      console.error('Errore business analytics AI:', error);
      res.status(500).json({ success: false, error: 'Errore elaborazione AI' });
    }
  });

  // Modulo 8: Analisi sostenibilità
  app.get("/api/ai/sustainability", async (req: Request, res: Response) => {
    try {
      const { flupsyId, timeframe = '30' } = req.query;
      const days = Number(timeframe);
      
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      // Recupera operazioni per calcolo sostenibilità
      let operationsQuery = db.select()
        .from(operations)
        .where(gte(operations.date, dateLimit.toISOString().split('T')[0]));

      if (flupsyId) {
        // Filtra per FLUPSY specifico tramite baskets
        operationsQuery = operationsQuery
          .innerJoin(baskets, eq(operations.basketId, baskets.id))
          .where(and(
            eq(baskets.flupsyId, Number(flupsyId)),
            gte(operations.date, dateLimit.toISOString().split('T')[0])
          ));
      }

      const sustainabilityOps = await operationsQuery.limit(100);

      // Recupera dati ambientali
      const environmentalData = await db.select()
        .from(sgrGiornalieri)
        .where(gte(sgrGiornalieri.recordDate, dateLimit))
        .limit(days);

      // Calcola metriche simulate (in futuro da sensori IoT reali)
      const totalOperations = sustainabilityOps.length;
      const totalProduction = sustainabilityOps.reduce((sum, op) => sum + (op.totalWeight || 0), 0);

      const sustainabilityData = {
        operations: sustainabilityOps.slice(0, 20), // Limita per AI
        environmentalData: environmentalData.map(env => ({
          date: env.recordDate?.toISOString(),
          temperature: env.temperature,
          ph: env.pH,
          oxygen: env.oxygen,
          salinity: env.salinity
        })),
        energyUsage: {
          daily: 45 + Math.random() * 10, // kWh simulati
          monthly: (45 + Math.random() * 10) * 30
        },
        waterUsage: {
          daily: 2500 + Math.random() * 500, // Litri simulati
          monthly: (2500 + Math.random() * 500) * 30
        },
        wasteProduction: {
          organic: totalProduction * 0.05, // 5% rifiuti organici
          plastic: totalOperations * 0.1, // Plastica da packaging
          chemical: totalOperations * 0.02 // Residui chimici
        },
        production: {
          totalKg: totalProduction / 1000, // Converti g in kg
          cycles: totalOperations
        }
      };

      const sustainabilityAnalysis = await AIService.sustainability.analyzeSustainability(sustainabilityData);

      res.json({
        success: true,
        analysis: sustainabilityAnalysis,
        metadata: {
          timeframe: `${days} giorni`,
          flupsyId: flupsyId || 'tutti',
          operationsAnalyzed: sustainabilityOps.length,
          environmentalReadings: environmentalData.length,
          totalProduction: `${(totalProduction / 1000).toFixed(2)} kg`
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