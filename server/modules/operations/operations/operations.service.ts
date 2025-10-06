/**
 * Service per la gestione delle operazioni
 * Contiene tutta la logica business per operazioni (prima-attivazione, screening, etc.)
 */

import { db } from '../../../db';
import { operations, baskets, flupsys, lots, sizes, basketLotComposition, cycles } from '../../../../shared/schema';
import { sql, eq, and, or, between, desc, inArray } from 'drizzle-orm';
import { OperationsCache } from '../../../operations-cache-service';

// Colonne per le query ottimizzate
const OPERATION_COLUMNS = {
  id: operations.id,
  date: operations.date,
  type: operations.type,
  basketId: operations.basketId,
  cycleId: operations.cycleId,
  sizeId: operations.sizeId,
  sgrId: operations.sgrId,
  lotId: operations.lotId,
  animalCount: operations.animalCount,
  totalWeight: operations.totalWeight,
  animalsPerKg: operations.animalsPerKg,
  averageWeight: operations.averageWeight,
  deadCount: operations.deadCount,
  mortalityRate: operations.mortalityRate,
  notes: operations.notes,
  metadata: operations.metadata,
  lot_id: lots.id,
  lot_arrivalDate: lots.arrivalDate,
  lot_supplier: lots.supplier,
  lot_supplierLotNumber: lots.supplierLotNumber,
  lot_quality: lots.quality,
  lot_animalCount: lots.animalCount,
  lot_weight: lots.weight,
  lot_notes: lots.notes,
  flupsyName: flupsys.name
};

export interface OperationsOptions {
  page?: number;
  pageSize?: number;
  cycleId?: number;
  basketId?: number;
  flupsyId?: number;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  type?: string;
}

class OperationsService {
  /**
   * Ottiene operazioni con paginazione, filtri e cache
   */
  async getOperations(options: OperationsOptions = {}) {
    const startTime = Date.now();
    console.log('Richiesta operazioni ottimizzata con opzioni:', options);
    
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;
    
    // Converte date da string a oggetti Date se necessario
    const dateFrom = options.dateFrom instanceof Date ? options.dateFrom : 
                    options.dateFrom ? new Date(options.dateFrom) : null;
    
    const dateTo = options.dateTo instanceof Date ? options.dateTo : 
                  options.dateTo ? new Date(options.dateTo) : null;
    
    // Genera chiave di cache
    const cacheKey = OperationsCache.generateCacheKey({
      page,
      pageSize,
      cycleId: options.cycleId,
      flupsyId: options.flupsyId,
      basketId: options.basketId,
      dateFrom: dateFrom?.toISOString().split('T')[0],
      dateTo: dateTo?.toISOString().split('T')[0],
      type: options.type
    });
    
    // Controlla se i risultati sono in cache
    const cachedResults = OperationsCache.get(cacheKey);
    if (cachedResults) {
      console.log(`Operazioni recuperate dalla cache in ${Date.now() - startTime}ms`);
      return cachedResults;
    }
    
    try {
      // Costruisci le condizioni di filtro
      const whereConditions: any[] = [];
      
      if (options.cycleId) {
        whereConditions.push(eq(operations.cycleId, options.cycleId));
      }
      
      if (options.basketId) {
        whereConditions.push(eq(operations.basketId, options.basketId));
      }
      
      // Filtro per intervallo di date
      if (dateFrom && dateTo) {
        const fromDateStr = dateFrom.toISOString().split('T')[0];
        const toDateStr = dateTo.toISOString().split('T')[0];
        whereConditions.push(between(operations.date, fromDateStr, toDateStr));
      } else if (dateFrom) {
        const fromDateStr = dateFrom.toISOString().split('T')[0];
        whereConditions.push(sql`${operations.date} >= ${fromDateStr}`);
      } else if (dateTo) {
        const toDateStr = dateTo.toISOString().split('T')[0];
        whereConditions.push(sql`${operations.date} <= ${toDateStr}`);
      }
      
      if (options.type) {
        whereConditions.push(sql`${operations.type} = ${options.type}`);
      }
      
      // Filtro per flupsyId con subquery ottimizzata
      if (options.flupsyId) {
        const basketSubquery = db
          .select({ id: baskets.id })
          .from(baskets)
          .where(eq(baskets.flupsyId, options.flupsyId));
        
        const basketIds = await basketSubquery;
        
        if (basketIds.length > 0) {
          const ids = basketIds.map(b => b.id);
          whereConditions.push(inArray(operations.basketId, ids));
        } else {
          console.log(`Nessun cestello trovato per flupsyId ${options.flupsyId}`);
          return { operations: [], totalCount: 0 };
        }
      }
      
      const whereClause = whereConditions.length > 0 
        ? and(...whereConditions) 
        : undefined;
      
      // Query per conteggio
      const countQuery = db
        .select({ count: sql`count(*)`.as('count') })
        .from(operations);
      
      if (whereClause) {
        countQuery.where(whereClause);
      }
      
      const countResult = await countQuery;
      const totalCount = parseInt(countResult[0].count as string);
      
      // Query principale con paginazione e JOIN
      let query = db
        .select(OPERATION_COLUMNS)
        .from(operations)
        .leftJoin(lots, eq(operations.lotId, lots.id))
        .leftJoin(baskets, eq(operations.basketId, baskets.id))
        .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
        .orderBy(desc(operations.date))
        .limit(pageSize)
        .offset(offset);
      
      if (whereClause) {
        query.where(whereClause);
      }
      
      const results = await query;
      
      // Batch preload composizioni
      const basketCyclePairs = results
        .filter(row => row.basketId && row.cycleId)
        .map(row => ({ basketId: row.basketId, cycleId: row.cycleId }));
      
      const compositionsMap = new Map<string, any[]>();
      
      if (basketCyclePairs.length > 0) {
        const allCompositions = await db
          .select({
            basketId: basketLotComposition.basketId,
            cycleId: basketLotComposition.cycleId,
            lotId: basketLotComposition.lotId,
            animalCount: basketLotComposition.animalCount,
            percentage: basketLotComposition.percentage,
            notes: basketLotComposition.notes,
            lotArrivalDate: lots.arrivalDate,
            lotSupplier: lots.supplier,
            lotSupplierLotNumber: lots.supplierLotNumber,
            lotQuality: lots.quality,
            lotAnimalCount: lots.animalCount,
            lotWeight: lots.weight,
            lotNotes: lots.notes
          })
          .from(basketLotComposition)
          .leftJoin(lots, eq(basketLotComposition.lotId, lots.id))
          .where(
            or(...basketCyclePairs.map(pair => 
              and(
                eq(basketLotComposition.basketId, pair.basketId),
                eq(basketLotComposition.cycleId, pair.cycleId)
              )
            ))
          )
          .orderBy(desc(basketLotComposition.percentage));
        
        for (const comp of allCompositions) {
          const key = `${comp.basketId}-${comp.cycleId}`;
          if (!compositionsMap.has(key)) {
            compositionsMap.set(key, []);
          }
          compositionsMap.get(key)!.push(comp);
        }
      }
      
      // Trasforma risultati
      const transformedResults = results.map((row) => {
        let lot = null;
        let lotComposition = null;
        
        if (row.basketId && row.cycleId) {
          const key = `${row.basketId}-${row.cycleId}`;
          const composition = compositionsMap.get(key);
          
          if (composition && composition.length > 0) {
            if (composition.length === 1) {
              lot = {
                id: composition[0].lotId,
                arrivalDate: composition[0].lotArrivalDate,
                supplier: composition[0].lotSupplier,
                supplierLotNumber: composition[0].lotSupplierLotNumber,
                quality: composition[0].lotQuality,
                animalCount: composition[0].lotAnimalCount,
                weight: composition[0].lotWeight,
                notes: composition[0].lotNotes
              };
            } else {
              lot = {
                id: composition[0].lotId,
                arrivalDate: composition[0].lotArrivalDate,
                supplier: composition[0].lotSupplier,
                supplierLotNumber: composition[0].lotSupplierLotNumber,
                quality: composition[0].lotQuality,
                animalCount: composition[0].lotAnimalCount,
                weight: composition[0].lotWeight,
                notes: composition[0].lotNotes
              };
              
              lotComposition = composition.map(c => ({
                lotId: c.lotId,
                animalCount: c.animalCount,
                percentage: c.percentage,
                lot: {
                  id: c.lotId,
                  arrivalDate: c.lotArrivalDate,
                  supplier: c.lotSupplier,
                  supplierLotNumber: c.lotSupplierLotNumber,
                  quality: c.lotQuality,
                  animalCount: c.lotAnimalCount,
                  weight: c.lotWeight,
                  notes: c.lotNotes
                }
              }));
            }
          } else if (row.lot_id) {
            lot = {
              id: row.lot_id,
              arrivalDate: row.lot_arrivalDate,
              supplier: row.lot_supplier,
              supplierLotNumber: row.lot_supplierLotNumber,
              quality: row.lot_quality,
              animalCount: row.lot_animalCount,
              weight: row.lot_weight,
              notes: row.lot_notes
            };
          }
        } else if (row.lot_id) {
          lot = {
            id: row.lot_id,
            arrivalDate: row.lot_arrivalDate,
            supplier: row.lot_supplier,
            supplierLotNumber: row.lot_supplierLotNumber,
            quality: row.lot_quality,
            animalCount: row.lot_animalCount,
            weight: row.lot_weight,
            notes: row.lot_notes
          };
        }
        
        const operation: any = {
          id: row.id,
          date: row.date,
          type: row.type,
          basketId: row.basketId,
          cycleId: row.cycleId,
          sizeId: row.sizeId,
          sgrId: row.sgrId,
          lotId: row.lotId,
          animalCount: row.animalCount,
          totalWeight: row.totalWeight,
          animalsPerKg: row.animalsPerKg,
          averageWeight: row.averageWeight,
          deadCount: row.deadCount,
          mortalityRate: row.mortalityRate,
          notes: row.notes,
          metadata: row.metadata,
          flupsyName: row.flupsyName
        };
        
        if (lot) {
          operation.lot = lot;
        }
        
        if (lotComposition) {
          operation.lotComposition = lotComposition;
        }
        
        return operation;
      });
      
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.log(`[PERFORMANCE] Query operazioni lenta: ${duration}ms`);
      }
      console.log(`Query operazioni completata in ${duration}ms: ${transformedResults.length} risultati su ${totalCount} totali`);
      
      const result = { operations: transformedResults, totalCount };
      
      // Salva in cache
      OperationsCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Errore recupero operazioni:', error);
      throw error;
    }
  }

  /**
   * Ottiene singola operazione per ID
   */
  async getOperationById(id: number) {
    const operation = await db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1);
    
    return operation[0] || null;
  }

  /**
   * Ottiene operazioni per cestello
   */
  async getOperationsByBasket(basketId: number) {
    const ops = await db
      .select()
      .from(operations)
      .where(eq(operations.basketId, basketId))
      .orderBy(desc(operations.date));
    
    return ops;
  }

  /**
   * Ottiene operazioni per ciclo
   */
  async getOperationsByCycle(cycleId: number) {
    const ops = await db
      .select()
      .from(operations)
      .where(eq(operations.cycleId, cycleId))
      .orderBy(desc(operations.date));
    
    return ops;
  }

  /**
   * Ottiene operazioni per intervallo di date
   */
  async getOperationsByDateRange(startDate: string, endDate: string) {
    const ops = await db
      .select()
      .from(operations)
      .where(
        and(
          sql`${operations.date} >= ${startDate}`,
          sql`${operations.date} <= ${endDate}`
        )
      )
      .orderBy(desc(operations.date));
    
    return ops;
  }

  /**
   * Crea una nuova operazione
   */
  async createOperation(data: any) {
    const [newOperation] = await db
      .insert(operations)
      .values(data)
      .returning();
    
    // Invalida cache
    OperationsCache.clear();
    
    return newOperation;
  }

  /**
   * Aggiorna un'operazione
   */
  async updateOperation(id: number, data: any) {
    const [updated] = await db
      .update(operations)
      .set(data)
      .where(eq(operations.id, id))
      .returning();
    
    // Invalida cache
    OperationsCache.clear();
    
    return updated;
  }

  /**
   * Elimina un'operazione
   */
  async deleteOperation(id: number) {
    const [deleted] = await db
      .delete(operations)
      .where(eq(operations.id, id))
      .returning();
    
    // Invalida cache
    OperationsCache.clear();
    
    return deleted;
  }
}

export const operationsService = new OperationsService();
