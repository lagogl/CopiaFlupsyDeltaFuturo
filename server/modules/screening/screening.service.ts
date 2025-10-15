import { db } from '../../db';
import { 
  screeningOperations, 
  screeningSourceBaskets, 
  screeningDestinationBaskets,
  screeningBasketHistory,
  screeningLotReferences,
  baskets,
  cycles,
  lots,
  sizes,
  flupsys,
  lotLedger,
  operations
} from '../../../shared/schema';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import NodeCache from 'node-cache';
import {
  calculateAggregatedComposition,
  distributeCompositionToDestinations,
  calculateAndRegisterMortality,
  type SourceBasket,
  type DestinationBasket
} from '../operations/shared/allocation';
import { balancedRounding } from '../../utils/balanced-rounding';

/**
 * Cache per le operazioni di screening
 * TTL: 2 minuti (screening è aggiornato frequentemente)
 */
const screeningCache = new NodeCache({ 
  stdTTL: 120,
  checkperiod: 60,
  useClones: false 
});

/**
 * Service per la gestione delle operazioni di screening (vagliatura)
 * Implementa Domain-Driven Design con caching ottimizzato
 */
export class ScreeningService {
  /**
   * Invalida tutte le cache del modulo screening
   */
  clearCache() {
    screeningCache.flushAll();
    console.log('🗑️ Cache screening invalidata completamente');
  }

  /**
   * GET /api/screenings
   * Lista operazioni di screening con paginazione
   * Pattern dall'app funzionante: query semplici + aggregazione lato app
   */
  async getScreenings(options: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const status = options.status || 'completed';
    const offset = (page - 1) * pageSize;

    const cacheKey = `screenings_page_${page}_pageSize_${pageSize}_status_${status}`;
    const cached = screeningCache.get(cacheKey);
    if (cached) {
      console.log(`🚀 SCREENING: Cache HIT - recuperati in 0ms`);
      return cached;
    }

    console.log(`🔄 SCREENING: Cache MISS - query al database...`);
    const startTime = Date.now();

    // 1. Count totale per paginazione (con filtro status)
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(screeningOperations)
      .where(eq(screeningOperations.status, status));

    // 2. Query principale semplice con filtro status
    const screenings = await db
      .select()
      .from(screeningOperations)
      .where(eq(screeningOperations.status, status))
      .orderBy(desc(screeningOperations.date), desc(screeningOperations.screeningNumber))
      .limit(pageSize)
      .offset(offset);

    // 3. Arricchisci con conteggi - Pattern dall'app funzionante
    const enrichedScreenings = await Promise.all(screenings.map(async (screening) => {
      // Query separate per source e destination baskets
      const sourceBaskets = await db
        .select()
        .from(screeningSourceBaskets)
        .where(eq(screeningSourceBaskets.screeningId, screening.id));

      const destBaskets = await db
        .select()
        .from(screeningDestinationBaskets)
        .where(eq(screeningDestinationBaskets.screeningId, screening.id));

      // Calcola totali lato applicazione con reduce()
      const totalSourceAnimals = sourceBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
      const totalDestAnimals = destBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);

      return {
        ...screening,
        sourceCount: sourceBaskets.length,
        destinationCount: destBaskets.length,
        totalSourceAnimals,
        totalDestAnimals,
        mortalityAnimals: totalSourceAnimals - totalDestAnimals
      };
    }));

    const result = {
      screenings: enrichedScreenings,
      pagination: {
        page,
        pageSize,
        totalCount: count,
        totalPages: Math.ceil(count / pageSize),
        hasNextPage: page < Math.ceil(count / pageSize),
        hasPreviousPage: page > 1
      }
    };

    const elapsedTime = Date.now() - startTime;
    console.log(`🚀 SCREENING: Cache SAVED (${enrichedScreenings.length} screenings) - query completata in ${elapsedTime}ms`);
    screeningCache.set(cacheKey, result);

    return result;
  }

  /**
   * GET /api/screenings/:id
   * Dettaglio completo di un'operazione di screening
   */
  async getScreeningById(id: number) {
    const cacheKey = `screening_detail_${id}`;
    const cached = screeningCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Main screening operation
    const [screening] = await db
      .select()
      .from(screeningOperations)
      .where(eq(screeningOperations.id, id));

    if (!screening) {
      return null;
    }

    // Source baskets con dettagli
    const sourceBaskets = await db
      .select({
        id: screeningSourceBaskets.id,
        screeningOperationId: screeningSourceBaskets.screeningId,
        basketId: screeningSourceBaskets.basketId,
        cycleId: screeningSourceBaskets.cycleId,
        animalCount: screeningSourceBaskets.animalCount,
        totalWeight: screeningSourceBaskets.totalWeight,
        animalsPerKg: screeningSourceBaskets.animalsPerKg,
        dismissed: screeningSourceBaskets.dismissed,
        sizeId: screeningSourceBaskets.sizeId,
        lotId: screeningSourceBaskets.lotId,
        basket: {
          id: baskets.id,
          physicalNumber: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          cycleCode: baskets.cycleCode,
          state: baskets.state
        },
        cycle: {
          id: cycles.id,
          lotId: cycles.lotId,
          startDate: cycles.startDate,
          state: cycles.state
        },
        flupsy: {
          id: flupsys.id,
          name: flupsys.name,
          location: flupsys.location
        },
        size: {
          id: sizes.id,
          code: sizes.code,
          name: sizes.name,
          minAnimalsPerKg: sizes.minAnimalsPerKg,
          maxAnimalsPerKg: sizes.maxAnimalsPerKg
        }
      })
      .from(screeningSourceBaskets)
      .leftJoin(baskets, eq(screeningSourceBaskets.basketId, baskets.id))
      .leftJoin(cycles, eq(screeningSourceBaskets.cycleId, cycles.id))
      .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
      .leftJoin(sizes, eq(screeningSourceBaskets.sizeId, sizes.id))
      .where(eq(screeningSourceBaskets.screeningId, id));

    // Destination baskets con dettagli (size viene dalla referenceSize della vagliatura)
    const destinationBaskets = await db
      .select({
        id: screeningDestinationBaskets.id,
        screeningOperationId: screeningDestinationBaskets.screeningId,
        basketId: screeningDestinationBaskets.basketId,
        cycleId: screeningDestinationBaskets.cycleId,
        category: screeningDestinationBaskets.category,
        flupsyId: screeningDestinationBaskets.flupsyId,
        row: screeningDestinationBaskets.row,
        position: screeningDestinationBaskets.position,
        positionAssigned: screeningDestinationBaskets.positionAssigned,
        animalCount: screeningDestinationBaskets.animalCount,
        liveAnimals: screeningDestinationBaskets.liveAnimals,
        totalWeight: screeningDestinationBaskets.totalWeight,
        animalsPerKg: screeningDestinationBaskets.animalsPerKg,
        deadCount: screeningDestinationBaskets.deadCount,
        mortalityRate: screeningDestinationBaskets.mortalityRate,
        notes: screeningDestinationBaskets.notes,
        basket: {
          id: baskets.id,
          physicalNumber: baskets.physicalNumber,
          flupsyId: baskets.flupsyId,
          cycleCode: baskets.cycleCode,
          state: baskets.state,
          row: baskets.row,
          position: baskets.position
        },
        cycle: {
          id: cycles.id,
          lotId: cycles.lotId,
          startDate: cycles.startDate,
          state: cycles.state
        },
        size: {
          id: sizes.id,
          code: sizes.code,
          name: sizes.name,
          minAnimalsPerKg: sizes.minAnimalsPerKg,
          maxAnimalsPerKg: sizes.maxAnimalsPerKg
        },
        flupsy: {
          id: flupsys.id,
          name: flupsys.name,
          location: flupsys.location
        }
      })
      .from(screeningDestinationBaskets)
      .leftJoin(screeningOperations, eq(screeningDestinationBaskets.screeningId, screeningOperations.id))
      .leftJoin(baskets, eq(screeningDestinationBaskets.basketId, baskets.id))
      .leftJoin(cycles, eq(screeningDestinationBaskets.cycleId, cycles.id))
      .leftJoin(sizes, eq(screeningOperations.referenceSizeId, sizes.id))
      .leftJoin(flupsys, eq(screeningDestinationBaskets.flupsyId, flupsys.id))
      .where(eq(screeningDestinationBaskets.screeningId, id));

    // Lot references
    const lotReferences = await db
      .select({
        id: screeningLotReferences.id,
        screeningOperationId: screeningLotReferences.screeningId,
        destinationBasketId: screeningLotReferences.destinationBasketId,
        destinationCycleId: screeningLotReferences.destinationCycleId,
        lotId: screeningLotReferences.lotId,
        lot: {
          id: lots.id,
          supplier: lots.supplier,
          supplierLotNumber: lots.supplierLotNumber,
          arrivalDate: lots.arrivalDate,
          quality: lots.quality
        }
      })
      .from(screeningLotReferences)
      .leftJoin(lots, eq(screeningLotReferences.lotId, lots.id))
      .where(eq(screeningLotReferences.screeningId, id));

    const result = {
      screening,
      sourceBaskets,
      destinationBaskets,
      lotReferences
    };

    screeningCache.set(cacheKey, result);
    return result;
  }

  /**
   * GET /api/screening/next-number
   * Ottieni il prossimo numero di vagliatura disponibile
   */
  async getNextScreeningNumber(): Promise<number> {
    const [result] = await db
      .select({ maxNumber: sql<number>`COALESCE(MAX(${screeningOperations.screeningNumber}), 0)` })
      .from(screeningOperations);
    
    return (result?.maxNumber || 0) + 1;
  }

  /**
   * GET /api/screening/operations
   * Lista operazioni di screening filtrate per status
   */
  async getScreeningOperations(status?: string) {
    const query = db
      .select()
      .from(screeningOperations)
      .orderBy(desc(screeningOperations.date), desc(screeningOperations.screeningNumber));

    if (status) {
      return await query.where(eq(screeningOperations.status, status));
    }

    return await query;
  }

  /**
   * POST /api/screening/operations
   * Crea una nuova operazione di screening
   */
  async createScreeningOperation(data: any) {
    const [result] = await db
      .insert(screeningOperations)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  /**
   * PATCH /api/screening/operations/:id
   * Aggiorna un'operazione di screening
   */
  async updateScreeningOperation(id: number, data: any) {
    const [result] = await db
      .update(screeningOperations)
      .set(data)
      .where(eq(screeningOperations.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  /**
   * POST /api/screening/operations/:id/complete
   * Completa un'operazione di screening
   * REFACTORED: Supporta allocazione proporzionale multi-lotto
   */
  async completeScreeningOperation(id: number) {
    console.log(`🔄 AVVIO COMPLETAMENTO SCREENING - ID: ${id}`);
    
    // 1. Aggiorna lo status a completed
    const [result] = await db
      .update(screeningOperations)
      .set({ status: 'completed' })
      .where(eq(screeningOperations.id, id))
      .returning();

    // 2. Recupera source baskets per ottenere i lotti di origine
    const sourceBaskets = await db
      .select({
        basketId: screeningSourceBaskets.basketId,
        cycleId: screeningSourceBaskets.cycleId,
        animalCount: screeningSourceBaskets.animalCount,
        lotId: screeningSourceBaskets.lotId
      })
      .from(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.screeningId, id));

    // 3. Recupera destination baskets per questa screening
    const destinationBaskets = await db
      .select({
        basketId: screeningDestinationBaskets.basketId,
        cycleId: screeningDestinationBaskets.cycleId,
        animalCount: screeningDestinationBaskets.animalCount
      })
      .from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningId, id));

    console.log(`📊 Source baskets: ${sourceBaskets.length}, Destination baskets: ${destinationBaskets.length}`);

    // 4. Calcola composizione aggregata multi-lotto
    const { aggregatedComposition, totalSourceAnimals } = await calculateAggregatedComposition(sourceBaskets as SourceBasket[]);
    
    console.log(`🧮 Composizione aggregata: ${aggregatedComposition.length} lotti, ${totalSourceAnimals} animali totali`);

    // 5. Distribuisce la composizione nei cestelli destinazione
    await distributeCompositionToDestinations(
      destinationBaskets as DestinationBasket[],
      aggregatedComposition,
      id,
      'screening'
    );

    // 6. Calcola mortalità totale
    const totalDestinationAnimals = destinationBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
    
    console.log(`📊 Animali origine: ${totalSourceAnimals}, Animali destinazione: ${totalDestinationAnimals}`);

    // 7. Registra mortalità proporzionale per lotto
    await calculateAndRegisterMortality(
      aggregatedComposition,
      totalSourceAnimals,
      totalDestinationAnimals,
      result.date,
      id,
      'screening'
    );

    // 7.5. ATTIVAZIONE CESTELLI DESTINAZIONE - Crea cicli, calcola peso e animali/kg
    console.log(`🆕 FASE 7.5: Attivazione cestelli destinazione con nuovi cicli`);
    
    // Recupera reference size per calcoli
    const referenceSize = result.referenceSizeId ? await db.select()
      .from(sizes)
      .where(eq(sizes.id, result.referenceSizeId))
      .limit(1) : null;
    
    // Calcola animali/kg dalla reference size (media del range)
    const referenceAnimalsPerKg = referenceSize && referenceSize[0] 
      ? Math.round((referenceSize[0].minAnimalsPerKg + referenceSize[0].maxAnimalsPerKg) / 2)
      : null;
    
    if (referenceAnimalsPerKg) {
      console.log(`📏 Taglia riferimento: ${referenceSize[0].code} (~${referenceAnimalsPerKg} animali/kg)`);
    }
    
    // Recupera lotto principale per i nuovi cicli
    const primaryLot = aggregatedComposition.length > 0 
      ? aggregatedComposition.reduce((max, lot) => lot.percentage > max.percentage ? lot : max)
      : null;
    
    // Recupera TUTTI i dati dei destination baskets (incluso flupsyId)
    const fullDestinationBaskets = await db.select()
      .from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningId, id));
    
    for (const destBasket of fullDestinationBaskets) {
      // Solo per cestelli non venduti (flupsyId presente)
      if (!destBasket.flupsyId) {
        console.log(`  ⚠️ Cestello ${destBasket.basketId}: vendita - skip attivazione ciclo`);
        continue;
      }
      
      console.log(`  📦 Attivazione cestello ${destBasket.basketId} (FLUPSY ${destBasket.flupsyId})...`);
      
      // Calcola peso e animali/kg
      const animalCount = destBasket.animalCount || 0;
      const totalWeight = referenceAnimalsPerKg && animalCount > 0
        ? Math.round((animalCount / referenceAnimalsPerKg) * 10) / 10  // 1 decimale
        : null;
      const animalsPerKg = referenceAnimalsPerKg;
      
      console.log(`     Animali: ${animalCount}, Peso: ${totalWeight}kg, Animali/kg: ${animalsPerKg}`);
      
      // Crea nuovo ciclo
      const [newCycle] = await db.insert(cycles).values({
        basketId: destBasket.basketId,
        lotId: primaryLot?.lotId || null,
        startDate: result.date,
        state: 'active'
      }).returning();
      
      console.log(`     ✅ Nuovo ciclo ${newCycle.id} creato`);
      
      // Aggiorna screening_destination_baskets con cycleId, peso e animali/kg
      await db.update(screeningDestinationBaskets)
        .set({
          cycleId: newCycle.id,
          totalWeight: totalWeight,
          animalsPerKg: animalsPerKg
        })
        .where(eq(screeningDestinationBaskets.id, destBasket.id));
      
      console.log(`     ✅ Aggiornato screening_destination_baskets con cycleId=${newCycle.id}, peso=${totalWeight}kg`);
      
      // Crea operazione prima-attivazione
      await db.insert(operations).values({
        date: result.date,
        type: 'prima-attivazione',
        basketId: destBasket.basketId,
        cycleId: newCycle.id,
        lotId: primaryLot?.lotId || null,
        animalCount: animalCount,
        totalWeight: totalWeight,
        animalsPerKg: animalsPerKg,
        sizeId: result.referenceSizeId,
        notes: `Da screening #${result.screeningNumber} - ${aggregatedComposition.length} lotti (principale: ${primaryLot?.lotId})`
      });
      
      console.log(`     ✅ Operazione prima-attivazione creata`);
      
      // Aggiorna stato basket
      await db.update(baskets)
        .set({
          state: 'occupied',
          currentCycleId: newCycle.id
        })
        .where(eq(baskets.id, destBasket.basketId));
      
      console.log(`     ✅ Basket ${destBasket.basketId} aggiornato a occupied`);
      
      // Aggiorna anche l'array destinationBaskets in memoria per il lot_ledger successivo
      const memBasket = destinationBaskets.find(b => b.basketId === destBasket.basketId);
      if (memBasket) {
        memBasket.cycleId = newCycle.id;
      }
    }
    
    console.log(`✅ Attivazione cestelli completata!`);

    // 8. Registra movimenti lot_ledger con balanced rounding
    console.log(`📝 FASE 8: Registrazione lot_ledger per tracciabilità`);
    for (const destBasket of destinationBaskets) {
      if (!destBasket.cycleId) continue;
      
      // Skip basket con 0 animali (balancedRounding richiede totalQuantity > 0)
      if (!destBasket.animalCount || destBasket.animalCount <= 0) {
        console.log(`  ⚠️ Basket ${destBasket.basketId}: 0 animali - skip lot_ledger`);
        continue;
      }

      // Usa balanced rounding per garantire totali corretti
      const percentagesMap = new Map<number, number>();
      for (const lot of aggregatedComposition) {
        percentagesMap.set(lot.lotId, lot.percentage / 100);
      }

      const allocations = balancedRounding(destBasket.animalCount, percentagesMap);

      for (const allocation of allocations.allocations) {
        if (allocation.roundedQuantity > 0) {
          const lotInfo = aggregatedComposition.find(l => l.lotId === allocation.lotId);
          
          await db.insert(lotLedger).values({
            date: result.date,
            lotId: allocation.lotId,
            type: 'activation',
            quantity: (-allocation.roundedQuantity).toString(),
            selectionId: id,
            basketId: destBasket.basketId,
            allocationMethod: 'proportional',
            notes: `Screening #${result.screeningNumber} - Lotto ${allocation.lotId} (${lotInfo?.percentage.toFixed(1)}%): ${allocation.roundedQuantity} animali`
          });

          console.log(`  ✅ Lot ledger: Lotto ${allocation.lotId} -> Cesto ${destBasket.basketId}: ${allocation.roundedQuantity} animali`);
        }
      }
      
      console.log(`  ✅ Totale registrato: ${allocations.totalAllocated} / ${destBasket.animalCount} animali`);
    }

    console.log(`✅ SCREENING COMPLETATO CON ALLOCAZIONE MULTI-LOTTO!`);

    // Invalida cache operazioni per mostrare le nuove operazioni di prima attivazione
    try {
      const { OperationsCache } = await import('../../operations-cache-service');
      OperationsCache.clear();
      console.log('🗑️ Cache operazioni invalidata dopo screening');
    } catch (error) {
      console.error('⚠️ Errore durante invalidazione cache operazioni:', error);
    }

    this.clearCache();
    return result;
  }

  /**
   * POST /api/screening/operations/:id/cancel
   * Annulla un'operazione di screening
   */
  async cancelScreeningOperation(id: number) {
    const [result] = await db
      .update(screeningOperations)
      .set({ status: 'cancelled' })
      .where(eq(screeningOperations.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // Source Baskets Methods
  async getSourceBaskets(screeningId: number) {
    return await db
      .select()
      .from(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.screeningId, screeningId));
  }

  async createSourceBasket(data: any) {
    const [result] = await db
      .insert(screeningSourceBaskets)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  async updateSourceBasket(id: number, data: any) {
    const [result] = await db
      .update(screeningSourceBaskets)
      .set(data)
      .where(eq(screeningSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async dismissSourceBasket(id: number) {
    const [result] = await db
      .update(screeningSourceBaskets)
      .set({ 
        dismissed: true
      })
      .where(eq(screeningSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async deleteSourceBasket(id: number) {
    const [result] = await db
      .delete(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // Destination Baskets Methods
  async getDestinationBaskets(screeningId: number) {
    return await db
      .select()
      .from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningId, screeningId));
  }

  async createDestinationBasket(data: any) {
    const [result] = await db
      .insert(screeningDestinationBaskets)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  async updateDestinationBasket(id: number, data: any) {
    const [result] = await db
      .update(screeningDestinationBaskets)
      .set(data)
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async assignPosition(id: number, position: any) {
    const [result] = await db
      .update(screeningDestinationBaskets)
      .set({ 
        position: position,
        positionAssigned: true 
      })
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  async deleteDestinationBasket(id: number) {
    const [result] = await db
      .delete(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.id, id))
      .returning();

    this.clearCache();
    return result;
  }

  // History and Lot References Methods
  async createHistory(data: any) {
    return await db
      .insert(screeningBasketHistory)
      .values(data)
      .returning();
  }

  async createLotReference(data: any) {
    const [result] = await db
      .insert(screeningLotReferences)
      .values(data)
      .returning();

    this.clearCache();
    return result;
  }

  /**
   * Genera report PDF per screening
   */
  async generatePDFReport(id: number): Promise<Buffer> {
    // Recupera screening
    const [screening] = await db.select()
      .from(screeningOperations)
      .where(eq(screeningOperations.id, id))
      .limit(1);
    
    if (!screening) {
      throw new Error(`Screening ${id} not found`);
    }
    
    // Recupera cestelli origine
    const sourceBaskets = await db.select()
      .from(screeningSourceBaskets)
      .where(eq(screeningSourceBaskets.screeningId, id));
    
    // Recupera cestelli destinazione
    const destBaskets = await db.select()
      .from(screeningDestinationBaskets)
      .where(eq(screeningDestinationBaskets.screeningId, id));
    
    // Calcola totali
    const totalSourceAnimals = sourceBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
    const totalDestAnimals = destBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
    const mortality = Math.max(0, totalSourceAnimals - totalDestAnimals);
    const mortalityPercent = totalSourceAnimals > 0 ? ((mortality / totalSourceAnimals) * 100).toFixed(2) : '0';
    
    // Genera HTML
    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Screening #${screening.screeningNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #1e40af;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-box {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .info-box h3 {
            margin: 0 0 10px 0;
            color: #1e40af;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f3f4f6;
            font-weight: bold;
        }
        .summary {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .mortality {
            color: #dc2626;
            font-weight: bold;
        }
        @media print {
            body {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <h1>Report Screening #${screening.screeningNumber}</h1>
    
    <div class="info-grid">
        <div class="info-box">
            <h3>Data Screening</h3>
            <p>${new Date(screening.date).toLocaleDateString('it-IT')}</p>
        </div>
        <div class="info-box">
            <h3>Stato</h3>
            <p>${screening.status === 'completed' ? 'Completata' : 'In corso'}</p>
        </div>
    </div>
    
    <h2>Cestelli Origine (${sourceBaskets.length})</h2>
    <table>
        <thead>
            <tr>
                <th>Cestello ID</th>
                <th>Animali</th>
                <th>Peso (kg)</th>
                <th>Animali/kg</th>
            </tr>
        </thead>
        <tbody>
            ${sourceBaskets.map(b => `
                <tr>
                    <td>#${b.basketId}</td>
                    <td>${(b.animalCount || 0).toLocaleString('it-IT')}</td>
                    <td>${(b.totalWeight || 0).toFixed(2)}</td>
                    <td>${(b.animalsPerKg || 0).toLocaleString('it-IT')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <h2>Cestelli Destinazione (${destBaskets.length})</h2>
    <table>
        <thead>
            <tr>
                <th>Cestello ID</th>
                <th>Animali</th>
                <th>Peso (kg)</th>
                <th>Animali/kg</th>
            </tr>
        </thead>
        <tbody>
            ${destBaskets.map(b => `
                <tr>
                    <td>#${b.basketId}</td>
                    <td>${(b.animalCount || 0).toLocaleString('it-IT')}</td>
                    <td>${(b.totalWeight || 0).toFixed(2)}</td>
                    <td>${(b.animalsPerKg || 0).toLocaleString('it-IT')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="summary">
        <h2>Riepilogo</h2>
        <p><strong>Totale Animali Origine:</strong> ${totalSourceAnimals.toLocaleString('it-IT')}</p>
        <p><strong>Totale Animali Destinazione:</strong> ${totalDestAnimals.toLocaleString('it-IT')}</p>
        <p class="mortality"><strong>Mortalità:</strong> ${mortality.toLocaleString('it-IT')} (${mortalityPercent}%)</p>
    </div>
    
    <p style="text-align: center; margin-top: 50px; color: #6b7280; font-size: 12px;">
        Report generato il ${new Date().toLocaleString('it-IT')} - FLUPSY Management System
    </p>
</body>
</html>
    `;
    
    // Usa puppeteer per generare PDF
    const { pdfGenerator } = await import('../../services/pdf-generator');
    const pdfBuffer = await pdfGenerator.generateFromHTML(html, {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    // Converti Uint8Array in Buffer
    return Buffer.from(pdfBuffer);
  }
}

export const screeningService = new ScreeningService();
